'use strict';

const EventEmitter = require('events');
const utils = require('../utils');

module.exports = exports = new EventEmitter();

/**
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser, options) {
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

    const items = await page.$$eval('#ctl00_ContentMain_CartGrid_grid > tbody > tr[data-index]', rows => rows.map(row => {
      // Why not simply use querySelectorAll here? querySelectorAll will return elements that match
      // comma-separated selectors in DOM order, not in the order of the selectors specified.
      const nodes = '.td-qty, .td-price, td.invoice, a[id$="lnkMouserPartNumber"], a[id$="lnkManufacturerPartNumber"], a[id$="lnkDescription"], a[id$="lnkInvoice"]'
        .split(', ').map(s => row.querySelector(s));
      return {
        texts: nodes.map(n => n && n.innerText),
        links: nodes.map(n => n && n.getAttribute('href'))
      };
    }));

    const invoiceLinks = new Map();

    let idx = 1;
    for (const item of items) {
      this.emit('item', {
        ord: orderData.id,
        dpn: item.texts[3],
        mpn: item.texts[4],
        idx: idx++,
        qty: item.texts[0],
        dsc: item.texts[5],
        upr: item.texts[1],
        lnk: item.links[3]
      });

      // We wont have an invoice number if that line item is cancelled from the order
      if (item.texts[6])
        invoiceLinks.set(item.texts[6], { no: item.texts[6], href: item.links[6] });
    }

    if (options.downloadInvoices) {
      for (const link of invoiceLinks.values()) {
        try {
          const invoice = await utils.downloadBlob(page, link.href);
          invoice.ord = orderData.id;
          invoice.id = link.no;
          this.emit('invoice', invoice);
        } catch (err) {
          console.error('Error downloading invoice', err);
        }
      }
    }
  }
};
