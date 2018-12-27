'use strict';

const EventEmitter = require('events');

module.exports = exports = new EventEmitter();

/**
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser) {
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
      id: await row.$eval('.dtTD-so-number', node => node.innerText),
      date: await row.$eval('.dtTD-date', node => node.innerText),
      status: await row.$eval('.dtTD-status', node => node.innerText)
    };
    this.emit('order', orderData);

    // Click the order details button, and wait for the order details to load in a new tab
    await (await row.$('a.salesorderButton')).click();
    const orderPage = await (await browser.waitForTarget(target => target.url().endsWith('/MyDigiKey/ReviewOrder'))).page();
    await orderPage.waitForSelector('.ro-cart .ro-subtotal');

    const data = await orderPage.evaluate(() =>
      $('.ro-cart .dataTable').DataTable({ retrieve: true }).buttons.exportData({
        format: {
          body: (innerHTML, row, col, node) =>
            col === 2 ? $(node).find('img').attr('src') :
              col === 3 ? $(node).find('a').attr('href') :
                node.innerText.trim(),
          header: (innerHTML, col, node) =>
            col === 3 ? 'Link' : node.innerHTML.trim()
        }
      })
    );
    const items = data.body.slice(0, -1).map(item => item.reduce((acc, cur, idx) => { acc[data.header[idx]] = cur; return acc; }, {}));
    for (const item of items) {
      this.emit('item', {
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

    orderPage.close();
  }
};
