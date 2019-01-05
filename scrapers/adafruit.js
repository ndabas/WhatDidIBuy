'use strict';

const parse = require('csv-parse/lib/sync');
const Scraper = require('../lib/Scraper');

module.exports = exports = new Scraper();

/**
 * @this {Scraper}
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser, options) {
  const page = await browser.newPage();
  await page.goto('https://www.adafruit.com/');

  // Wait for the user to log in and go to the order history page
  // await page.waitForResponse('https://www.adafruit.com/order_history', { timeout: 0 });
  await page.waitForSelector('.history-listing', { timeout: 0 });

  // Download the CSV data files
  const downloadText = url => window.fetch(url).then(resp => resp.text());

  const ordersCsv = await page.evaluate(downloadText, 'https://www.adafruit.com/order_history?action=orders-csv');
  const orders = parse(ordersCsv, { columns: true });
  console.log(`Found ${orders.length} orders.`);
  for (const order of orders) {
    this.order({
      id: order.order_id,
      date: order.date_purchased,
      status: order.order_status
    });
  }

  const orderIds = new Set();

  const productsCsv = await page.evaluate(downloadText, 'https://www.adafruit.com/order_history?action=products-csv');
  const items = parse(productsCsv, { columns: true });
  console.log(`Found ${items.length} items.`);
  let idx = 1;
  for (const item of items) {
    this.item({
      ord: item.order,
      dpn: item['product id'],
      idx: idx++,
      qty: item.quantity,
      dsc: item['product name'],
      upr: item.price
    });
    orderIds.add(item.order);
  }

  // Chrome in head-ed mode does not support saving PDFs via the DevTools protocol.
  // We could just save the HTML page as-is but we will need to add a <base href=""> tag to resolve
  // included images/CSS etc.
  /* if (options.downloadInvoices) {
    for (const orderId of orderIds) {
      try {
        await page.goto(`https://www.adafruit.com/invoice.php?order_id=${orderId}`);
        this.emit('invoice', {
          ord: orderId,
          mime: 'application/pdf',
          buffer: await page.pdf()
        });
      } catch (err) {
        console.error('Error downloading invoice', err);
      }
    }
  } */
};
