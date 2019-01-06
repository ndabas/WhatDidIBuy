'use strict';

const moment = require('moment');
const querystring = require('querystring');
const utils = require('../utils');
const Scraper = require('../lib/Scraper');

module.exports = exports = new Scraper();

/**
 * @this {Scraper}
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser, options) {
  const page = await browser.newPage();

  // Send the user to the login page
  await page.goto('https://www.digikey.com/MyDigiKey');

  // Wait for the order summary table on the My Digi-Key page (which means we are logged in)
  await page.waitForSelector('table.dataTable', { timeout: 0 });

  // Go to the order list page
  await page.goto('https://www.digikey.com/MyDigiKey/Orders');

  // Choose to show all orders
  await page.waitForSelector('#DataTables_Table_0_length select');
  await page.select('#DataTables_Table_0_length select', '-1');
  await page.waitForSelector('a.salesorderButton');

  // Select all order rows that have a clickable sales order ID
  const orderRows = await page.$x('//table[@id="DataTables_Table_0"]/tbody/tr[td/form]');

  console.log(`Found ${orderRows.length} orders.`);

  for (const row of orderRows) {
    await page.bringToFront();

    const orderData = {
      id: await row.$eval('.dtTD-so-number', node => node.textContent.trim()),
      date: moment(await row.$eval('.dtTD-date', node => node.textContent.trim()), 'M/D/YYYY', true).toDate(),
      status: await row.$eval('.dtTD-status', node => node.textContent.trim())
    };
    this.order(orderData);

    // Click the order details button, and wait for the order details to load in a new tab
    await (await row.$('a.salesorderButton')).click();
    const orderPage = await (await browser.waitForTarget(target => target.url().endsWith('/MyDigiKey/ReviewOrder'))).page();
    await orderPage.waitForSelector('.ro-cart .ro-subtotal');

    // Use the DataTables export functionality to get the data
    // https://datatables.net/reference/api/buttons.exportData()
    const data = await orderPage.evaluate(() =>
      $('.ro-cart .dataTable').DataTable({ retrieve: true }).buttons.exportData({
        format: {
          body: (innerHTML, row, col, node) =>
            col === 2 ? $(node).find('img').attr('src') :
              col === 3 ? $(node).find('a').attr('href') :
                node.textContent.trim(),
          header: (innerHTML, col, node) =>
            col === 3 ? 'Link' : node.innerHTML.trim()
        }
      })
    );
    // The data has an array of header names, and an array of rows, each of which is an array of
    // columns. Convert it to an array of objects for ease of use. The last item in the body array
    // is a subtotal row, so we ignore that.
    const items = data.body.slice(0, -1).map(item => item.reduce((acc, cur, idx) => { acc[data.header[idx]] = cur; return acc; }, {}));
    for (const item of items) {
      this.item({
        ord: orderData.id,
        dpn: item['Part Number'],
        mpn: item['Manufacturer Part Number'],
        idx: item['Index'],
        qty: item['Quantity'],
        dsc: item['Description'],
        lnk: item['Link'],
        img: item['Image'],
        upr: item['Unit Price']
      });
    }

    // $$().map(form => Array.from(form.querySelectorAll('input[type="hidden"]')).reduce((acc, cur) => { acc[cur.name] = cur.value; return acc;  }, {}))
    if (options.downloadInvoices) {
      const invoiceForms = await orderPage.$$eval('form[action="/MyDigiKey/ReviewOrder/ViewPDF"]', forms =>
        forms.map(form =>
          Array.from(form.querySelectorAll('input[type="hidden"]'))
            .reduce((acc, cur) => { acc[cur['name']] = cur['value']; return acc; }, {})));
      for (const form of invoiceForms) {
        try {
          const invoice = await utils.downloadBlob(orderPage, '/MyDigiKey/ReviewOrder/ViewPDF', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring.stringify(form)
          });
          this.invoice({ ord: orderData.id, id: form['invoiceId'], ...invoice });
        } catch (err) {
          console.error('Error downloading invoice', err);
        }
      }
    }

    orderPage.close();
  }
};
