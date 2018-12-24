'use strict';

const EventEmitter = require('events');

module.exports = exports = new EventEmitter();

/**
 * @param browser { import("puppeteer").Browser }
 */
exports.scrape = async function (browser) {
  const page = await browser.newPage();
  await page.goto('https://www.digikey.com/MyDigiKey');
  await page.waitForSelector('table.dataTable', { timeout: 0 });
  await page.goto('https://www.digikey.com/MyDigiKey/Orders');
  await page.waitForSelector('#DataTables_Table_0_length select');
  await page.select('#DataTables_Table_0_length select', '-1');
  await page.waitForSelector('a.salesorderButton');
  const orderLinks = await page.$$('a.salesorderButton');

  console.log(`Found ${orderLinks.length} orders.`);

  for (const orderLink of orderLinks) {
    await page.bringToFront();
    await orderLink.click();
    const orderPage = await (await browser.waitForTarget(target => target.url().endsWith('/MyDigiKey/ReviewOrder'))).page();
    await orderPage.waitForSelector('.ro-cart .ro-subtotal');
    const orderData = {
      id: await orderPage.$eval('#tblOrderHeaderInfo > div > div:nth-child(3) label', node => node.innerText),
      date: await orderPage.$eval('#tblOrderHeaderInfo > div > div:nth-child(4) > span:nth-child(2)', node => node.innerText)
    };

    this.emit('order', orderData);

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
