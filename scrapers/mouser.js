'use strict';

const EventEmitter = require('events');
const utils = require('../utils');

module.exports = exports = new EventEmitter();

/**
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser) {
  const page = await browser.newPage();

  // Mouser does not like bots. Without the next line, they wont let you in even after solving a CAPTCHA
  await utils.hideWebDriver(page);
  await page.goto('https://www.mouser.com/');

  // Wait for the user to log in, and then navigate to the to order history page
  await page.waitForSelector('#lnkAccSumm', { timeout: 0 });
  await (await page.waitForSelector('#OrdrHst')).click();

  await page.waitForSelector('#tblOrders > tbody > tr');
  const orderLinks = await page.$$eval('#tblOrders > tbody > tr > td:nth-child(2) > a', nodes => nodes.map(n => n.getAttribute('href')));
  console.log(`Found ${orderLinks.length} orders.`);

  for (const orderLink of orderLinks) {
    await page.goto(orderLink);
    await page.waitForSelector('#ctl00_ContentMain_SummaryInfo_trOrderTotal');
    const orderData = {
      id: await page.$eval('#ctl00_ContentMain_OrderDetailHeader_lblSalesOrderNumber', node => node.innerText),
      date: await page.$eval('#ctl00_ContentMain_OrderDetailHeader_lblOrderDateHeader', node => node.innerText),
      status: await page.$eval('td.orderData', node => node.innerText.split('\n')[3])
    };

    this.emit('order', orderData);

    const items = await page.$$('#ctl00_ContentMain_CartGrid_grid > tbody > tr[data-index]');
    let idx = 1;
    for (const item of items) {
      const cols = await item.$$eval('td', nodes => nodes.map(n => n.innerText));
      const links = await item.$$eval('a', nodes => nodes.map(n => n.getAttribute('href')));

      if (cols.length < 11 || links.length < 1) {
        continue;
      }

      this.emit('item', {
        ord: orderData.id,
        dpn: await cols[3],
        mpn: await cols[5],
        idx: idx++,
        qty: await cols[9],
        dsc: await cols[7],
        upr: await cols[10],
        lnk: await links[0]
      });
    }
  }
};
