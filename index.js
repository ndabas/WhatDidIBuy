'use strict';

const fs = require('fs');
const util = require('util');
const puppeteer = require('puppeteer');
const stringify = require('csv-stringify');
const mime = require('mime-types');
const mkdirp = require('mkdirp');
const yargs = require('yargs');

(async function () {
  const scrapers = await util.promisify(fs.readdir)('./scrapers/');
  scrapers
    .filter(s => s.endsWith('.js'))
    .map(s => s.slice(0, -3))
    .forEach(s => yargs.command(s));
  yargs.demandCommand(1, 'Please specify a scraper module to use.');
  yargs.option('no-invoices', { type: 'boolean', describe: 'Don\'t download invoices' });

  const argv = yargs.argv;

  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });

  const scraperName = argv._[0];
  const scrapeOptions = {
    downloadInvoices: argv.invoices !== false
  };
  /** @type {import("./lib/Scraper")} */
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
    await scraper.scrape(browser, scrapeOptions);
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR', err);
  } finally {
    await browser.close();
    orderWriter.end();
    itemsWriter.end();
  }
})();
