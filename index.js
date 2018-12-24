'use strict';

const fs = require('fs');
require('chromedriver');
const { Builder } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');

if (process.argv.length < 3) {
    console.error('Usage: node index.js <scraper>');
    return;
}

(async function () {
    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(
            new Options()//.addArguments('user-data-dir=C:\\Users\\Nikhil\\AppData\\Local\\Google\\Chrome\\User Data', 'disable-gpu')
        )
        .build();

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
        await scraper.scrape(driver);
        console.log('SUCCESS');
    } catch (err) {
        console.error('ERROR: ' + err)
    }
    finally {
        await driver && driver.quit();
        fs.writeFileSync(`./data/${scraperName}-orders.json`, JSON.stringify(orders));
        fs.writeFileSync(`./data/${scraperName}-items.json`, JSON.stringify(items));
    }
})();
