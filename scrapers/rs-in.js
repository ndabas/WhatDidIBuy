'use strict';

const EventEmitter = require('events');
const utils = require('../utils');

module.exports = exports = new EventEmitter();

/**
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser) {
  const page = await browser.newPage();

  await page.goto('https://in.rsdelivers.com/myaccount/myaccount?section=Orders');

  // Wait for the user to log in, and then navigate to the to order history page
  await page.waitForSelector('a.aViewOrderDetails');
  const orderLinks = await page.$$eval('a.aViewOrderDetails', nodes => nodes.map(n => n.getAttribute('href')));
  console.log(`Found ${orderLinks.length} orders.`);

  for (const orderLink of orderLinks) {
    // The links are relative, so we cannot use page.goto directly
    await page.evaluate(link => window.location = link, orderLink);
    await page.waitForSelector('.divTotals');
    const orderData = {
      id: await page.$$eval('.spanOrderId', nodes => nodes[1].innerText),
      date: await page.$eval('.divOrderDate', node => node.innerText.split(': ')[1])
    };

    this.emit('order', orderData);

    const items = await page.$$('.tblTabularList > tbody > tr');
    let idx = 1;
    for (const item of items) {
      const cols = await item.$$eval('td', nodes => nodes.map(n => n.innerText));
      const spans = await item.$$eval('span', nodes => nodes.reduce((acc, cur) => { acc[cur.className] = cur.innerText; return acc; }, {}));
      const links = await item.$$eval('a', nodes => nodes.map(n => ({ href: n.getAttribute('href'), innerText: n.innerText })));

      if (cols.length < 4 || links.length < 1) {
        continue;
      }

      this.emit('item', {
        ord: orderData.id,
        dpn: spans.spanStockNumberValue,
        idx: idx++,
        qty: cols[1],
        dsc: links[0].innerText,
        upr: cols[2],
        lnk: links[0].href
      });
    }
  }
};
