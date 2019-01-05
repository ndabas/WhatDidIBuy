'use strict';

const Scraper = require('../lib/Scraper');

module.exports = exports = new Scraper();

/**
 * @this {Scraper}
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser) {
  const page = await browser.newPage();

  await page.goto('https://www.seeedstudio.com/web/user/order/all');

  // Wait for the user to login and navigate to the order history page
  const orders = [];
  const waitForOrders = async () => {
    const ordersResponse = await page.waitForResponse(response => response.url().startsWith('https://wapi.seeedstudio.com/order/list'), { timeout: 0 });
    const ordersEnvelope = JSON.parse(await ordersResponse.text());
    Array.prototype.push.apply(orders, ordersEnvelope.data.content);
    console.log(`Loaded ${ordersEnvelope.data.content.length} orders.`);
    return ordersEnvelope;
  };

  // Click the pager to get all orders
  if ((await waitForOrders()).data.total_page > 1) {
    // Start from page 2 and ignore the first/last/prev/next buttons
    await page.waitForSelector('li.page-item a');
    const pageLinks = (await page.$$('li.page-item a')).slice(3, -2);
    for (const link of pageLinks) {
      await Promise.all([
        waitForOrders(),
        link.click()
      ]);
    }
  }

  console.log(`Found ${orders.length} orders total.`);

  const processOrder = order => {
    if (order.product && order.product.length) {
      const orderData = {
        id: order.order_info.order_sn,
        date: new Date(order.order_info.create_time * 1000).toDateString(),
        status: order.order_info.order_status
      };

      this.order(orderData);

      let idx = 1;
      for (const item of order.product) {
        this.item({
          ord: orderData.id,
          dpn: item.product_id,
          idx: idx++,
          qty: item.quantity,
          dsc: item.product_name,
          upr: item.final_price,
          img: item.products_image
        });
      }
    }

    if (order.child_order && order.child_order.length)
      order.child_order.forEach(processOrder);
  };

  orders.forEach(processOrder);
};
