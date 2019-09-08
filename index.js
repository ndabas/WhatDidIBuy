#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const moment = require('moment');
const puppeteer = require('puppeteer');
const stringify = require('csv-stringify');
const mime = require('mime-types');
const makeDir = require('make-dir');
const yargs = require('yargs');

(async function () {
  const scrapers = await util.promisify(fs.readdir)(path.join(__dirname, 'scrapers'));
  scrapers
    .filter(s => s.endsWith('.js'))
    .map(s => s.slice(0, -3))
    .forEach(s => yargs.command(s));
  yargs.demandCommand(1, 'Please specify a scraper module to use.');
  yargs.option('no-invoices', {
    type: 'boolean',
    describe: 'Don\'t download invoices'
  });
  yargs.option('d', {
    type: 'string',
    describe: 'Output directory for CSVs and invoices',
    alias: 'out-dir',
    default: '.'
  });
  yargs.scriptName('whatdidibuy');

  const argv = yargs.argv;

  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });

  const scraperName = argv._[0];
  const basePath = path.join(argv.d, `${scraperName}`);
  const scrapeOptions = {
    downloadInvoices: argv.invoices !== false
  };
  /** @type {import("./lib/Scraper")} */
  const scraper = require(`./scrapers/${scraperName}`);

  const orderWriter = stringify({
    header: true,
    record_delimiter: 'windows',
    columns: ['site', 'id', 'date', 'status'],
    cast: {
      date: value => moment(value).format('YYYY-MM-DD')
    }
  });
  orderWriter.pipe(fs.createWriteStream(`${basePath}-orders.csv`));

  const itemsWriter = stringify({
    header: true,
    record_delimiter: 'windows',
    columns: ['site', 'ord', 'idx', 'dpn', 'mpn', 'mfr', 'qty', 'dsc', 'upr', 'lnk', 'img']
  });
  itemsWriter.pipe(fs.createWriteStream(`${basePath}-items.csv`));

  scraper.on('order', order => {
    order.site = scraperName;
    console.log('Processing order', order.id);
    orderWriter.write(order);
  });

  scraper.on('item', item => {
    item.site = scraperName;
    itemsWriter.write(item);
  });

  let dirMade = false;
  const writeFile = util.promisify(fs.writeFile);

  scraper.on('invoice', async invoice => {
    const suffix = invoice.id ? `_${invoice.id}` : '';
    const invoicePath = path.join(basePath, `${invoice.ord}${suffix}.${mime.extension(invoice.mime)}`);
    console.log('Saving invoice', invoicePath);

    if (!dirMade) {
      await makeDir(basePath);
      dirMade = true;
    }

    await writeFile(invoicePath, invoice.buffer);
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
