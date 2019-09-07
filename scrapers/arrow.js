'use strict';

const utils = require('../lib/utils');
const Scraper = require('../lib/Scraper');

module.exports = exports = new Scraper();

/**
 * @this {Scraper}
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser, options) {
  const page = await browser.newPage();

  // Arrow's pages can sometimes be slow to load, so disable the default 30-second timeout
  page.setDefaultNavigationTimeout(0);
  // Arrow seems to detect automation and then respond with 403
  await utils.hideWebDriver(page);
  await page.goto('https://www.arrow.com/');

  // Wait for the user to login and navigate to the order history page
  const ordersResponse = await page.waitForResponse(response => response.url().startsWith('https://www.arrow.com/services/orders?format=json'), { timeout: 0 });
  const orders = JSON.parse(await ordersResponse.text());
  console.log(`Found ${orders.length} orders.`);

  for (let order of orders) {
    // Just query their API directly
    await page.goto(`https://www.arrow.com/services/orders/${order.no}?format=json&cacheBusting=${new Date().getTime()}`);
    order = JSON.parse(await page.$eval('pre', node => node.textContent));
    const orderData = {
      id: order.no,
      date: new Date(order.orderDate),
      status: order.communicatedStatus
    };

    this.order(orderData);

    for (const item of order.webItems) {
      this.item({
        ord: orderData.id,
        mpn: item.detail.mpn,
        mfr: item.detail.manufacturerName,
        idx: item.lineNo,
        qty: item.quantity,
        dsc: item.description,
        upr: item.unitPrice
      });
    }

    if (options.downloadInvoices && order.webShipments && order.webShipments.length) {
      const invoiceNos = order.webShipments.map(s => s.invoiceNo).filter(n => n);
      for (const no of invoiceNos) {
        try {
          const invoice = await utils.downloadBlob(page, `https://www.arrow.com/services/invoices/${no}`);
          this.invoice({ ord: orderData.id, id: no, ...invoice });
        } catch (err) {
          console.error('Error downloading invoice', err);
        }
      }
    }
  }
};
