'use strict';

const EventEmitter = require('events');

module.exports = exports = new EventEmitter();

/**
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser) {
  const page = await browser.newPage();

  // Arrow's pages can sometimes be slow to load, so disable the default 30-second timeout
  page.setDefaultNavigationTimeout(0);
  await page.goto('https://www.arrow.com/');

  // Wait for the user to login and navigate to the order history page
  const ordersResponse = await page.waitForResponse(response => response.url().startsWith('https://www.arrow.com/services/orders?format=json'), { timeout: 0 });
  const orders = JSON.parse(await ordersResponse.text());
  console.log(`Found ${orders.length} orders.`);

  for (let order of orders) {
    // Just query their API directly
    await page.goto(`https://www.arrow.com/services/orders/${order.no}?format=json&cacheBusting=${new Date().getTime()}`);
    order = JSON.parse(await page.$eval('pre', node => node.innerText));
    const orderData = {
      id: order.no,
      date: new Date(order.orderDate),
      status: order.communicatedStatus
    };

    this.emit('order', orderData);

    for (const item of order.webItems) {
      this.emit('item', {
        ord: orderData.id,
        mpn: item.detail.mpn,
        mfr: item.detail.manufacturerName,
        idx: item.lineNo,
        qty: item.quantity,
        dsc: item.description,
        upr: item.unitPrice
      });
    }
  }
};
