'use strict';

const fs = require('fs');
const puppeteer = require('puppeteer');

if (process.argv.length < 3) {
  console.error('Usage: node index.js <scraper>');
  return;
}

(async function () {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });

  const scraperName = process.argv[2];
  const scraper = require(`./scrapers/${scraperName}`);

  const orders = [], items = [];
  scraper.on('order', order => {
    order.id = `${scraperName}:${order.id}`;
    console.log('Processing order', order.id);
    orders.push(order);
  });
  scraper.on('item', item => {
    items.push(item);
  });

  try {
    await scraper.scrape(browser);
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR: ' + err)
  }
  finally {
    await browser.close();
    fs.writeFileSync(`./data/${scraperName}-orders.json`, JSON.stringify(orders));
    fs.writeFileSync(`./data/${scraperName}-items.json`, JSON.stringify(items));
  }
})();
