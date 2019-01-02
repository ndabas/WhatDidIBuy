'use strict';

const fs = require('fs');
const puppeteer = require('puppeteer');
const stringify = require('csv-stringify');
const mime = require('mime-types');
const mkdirp = require('mkdirp');

if (process.argv.length < 3) {
  console.error('Usage: node index.js <scraper>');
  process.exit(1);
}

(async function () {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });

  const scraperName = process.argv[2];
  const scraper = require(`./scrapers/${scraperName}`);

  // @ts-ignore: TypeScript isn't picking up the correct stringify.Options type
  const orderWriter = stringify({ header: true, record_delimiter: 'windows', columns: ['site', 'id', 'date', 'status'] });
  orderWriter.pipe(fs.createWriteStream(`./data/${scraperName}-orders.csv`));

  // @ts-ignore: TypeScript isn't picking up the correct stringify.Options type
  const itemsWriter = stringify({ header: true, record_delimiter: 'windows', columns: ['site', 'ord', 'idx', 'dpn', 'mpn', 'mfr', 'qty', 'dsc', 'upr', 'lnk', 'img'] });
  itemsWriter.pipe(fs.createWriteStream(`./data/${scraperName}-items.csv`));

  scraper.on('order', order => {
    order.site = scraperName;
    console.log('Processing order', order.id);
    orderWriter.write(order);
  });

  scraper.on('item', item => {
    item.site = scraperName;
    itemsWriter.write(item);
  });

  scraper.on('invoice', invoice => {
    const suffix = invoice.id ? `_${invoice.id}` : '';
    const path = `./data/${scraperName}/${invoice.ord}${suffix}.${mime.extension(invoice.mime)}`;
    console.log('Saving invoice', path);
    mkdirp.sync(`./data/${scraperName}`);
    fs.writeFileSync(path, invoice.buffer);
  });

  try {
    await scraper.scrape(browser, { downloadInvoices: true });
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
