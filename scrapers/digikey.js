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

    const items = await orderPage.$$('#DataTables_Table_0 > tbody > tr');
    for (const item of items) {
      const cols = await item.$$eval('td', nodes => nodes.map(n => n.innerText));
      const links = await item.$$eval('a', nodes => nodes.map(n => n.getAttribute('href')));
      const images = await item.$$eval('img', nodes => nodes.map(n => n.getAttribute('src')));

      if (cols.length < 11 || links.length < 1 || images.length < 1) {
        continue;
      }

      const pn = cols[3].split('\n');
      this.emit('item', {
        ord: orderData.id,
        dpn: pn[0],
        mpn: pn[1],
        idx: cols[0],
        qty: cols[1],
        dsc: cols[6],
        upr: cols[10],
        lnk: links[0],
        img: images[0]
      });
    }

    orderPage.close();
  }
};
