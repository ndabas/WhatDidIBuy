'use strict';

const moment = require('moment');
const parse = require('csv-parse/lib/sync');
const Scraper = require('../lib/Scraper');
const utils = require('../lib/utils');

module.exports = exports = new Scraper();

/**
 * @this {Scraper}
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser, options) {
  const page = await browser.newPage();

  // The CAPTCHA on the login page seems to be easier to pass with the following line
  await utils.hideWebDriver(page);
  await page.goto('https://www.sparkfun.com/');

  // Wait for the user to log in and go to the order history page
  await page.waitForSelector('a[href="https://www.sparkfun.com/orders.json"]', { timeout: 0 });

  const orders = JSON.parse(await utils.downloadText(page, 'https://www.sparkfun.com/orders.json'));
  console.log(`Found ${orders.length} orders.`);

  for (const order of orders) {
    this.order({
      id: order.id,
      date: moment(order.date, 'YYYY-MM-DD HH:mm:ss.SSSSZZ', true).toDate(),
      status: order.status
    });

    const productsCsv = await utils.downloadText(page, `https://www.sparkfun.com/orders/${order.id}.csv`);
    const items = parse(productsCsv, { columns: true });
    let idx = 1;
    for (const item of items) {
      this.item({
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
        this.invoice({ ord: order.id, ...invoice });
      } catch (err) {
        console.error('Error downloading invoice', err);
      }
    }
  }
};
