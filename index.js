'use strict';

const fs = require('fs');
const puppeteer = require('puppeteer');
const stringify = require('csv-stringify')

if (process.argv.length < 3) {
  console.error('Usage: node index.js <scraper>');
  return;
}

(async function () {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });

  const scraperName = process.argv[2];
  const scraper = require(`./scrapers/${scraperName}`);

  const orderWriter = stringify({ header: true, record_delimiter: 'windows', columns: ['id', 'date', 'status'] });
  orderWriter.pipe(fs.createWriteStream(`./data/${scraperName}-orders.csv`));
  const itemsWriter = stringify({ header: true, record_delimiter: 'windows', columns: ['ord', 'idx', 'dpn', 'mpn', 'mfr', 'qty', 'dsc', 'upr', 'lnk', 'img'] });
  itemsWriter.pipe(fs.createWriteStream(`./data/${scraperName}-items.csv`));

  scraper.on('order', order => {
    order.id = `${scraperName}:${order.id}`;
    console.log('Processing order', order.id);
    orderWriter.write(order);
  });
  scraper.on('item', item => {
    itemsWriter.write(item);
  });

  try {
    await scraper.scrape(browser);
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR', err);
  }
  finally {
    await browser.close();
    orderWriter.end();
    itemsWriter.end();
  }
})();
