'use strict';

const EventEmitter = require('events');
const parse = require('csv-parse/lib/sync');
const utils = require('../utils');

module.exports = exports = new EventEmitter();

/**
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser, options) {
  const page = await browser.newPage();

  // The CAPTCHA on the login page seems to be easier to pass with the following line
  await utils.hideWebDriver(page);
  await page.goto('https://www.sparkfun.com/');

  // Wait for the user to log in and go to the order history page
  await page.waitForSelector('a[href="https://www.sparkfun.com/orders.json"]', { timeout: 0 });

  // Download the CSV data files
  const downloadText = url => window.fetch(url).then(resp => resp.text());

  const orders = JSON.parse(await page.evaluate(downloadText, 'https://www.sparkfun.com/orders.json'));
  console.log(`Found ${orders.length} orders.`);

  for (const order of orders) {
    this.emit('order', {
      id: order.id,
      date: order.date,
      status: order.status
    });

    const productsCsv = await page.evaluate(downloadText, `https://www.sparkfun.com/orders/${order.id}.csv`);
    const items = parse(productsCsv, { columns: true });
    let idx = 1;
    for (const item of items) {
      this.emit('item', {
        ord: order.id,
        dpn: item.sku,
        idx: idx++,
        qty: item.quantity,
        dsc: item.name,
        upr: item['unit price (USD)']
      });
    }

    if (options.downloadInvoices) {
      try {
        const invoice = await utils.downloadBlob(page, `https://www.sparkfun.com/invoice/${order.id}`);
        invoice.ord = order.id;
        this.emit('invoice', invoice);
      } catch (err) {
        console.error('Error downloading invoice', err);
      }
    }
  }
};
