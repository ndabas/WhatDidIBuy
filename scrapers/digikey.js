'use strict';

const EventEmitter = require('events');
const { By, until } = require('selenium-webdriver');

module.exports = exports = new EventEmitter();

exports.scrape = async function (driver) {
    await driver.get('https://www.digikey.com/MyDigiKey');
    await driver.wait(until.elementLocated(By.css('table.dataTable')));
    await driver.get('https://www.digikey.com/MyDigiKey/Orders');
    await driver.wait(until.elementLocated(By.css('#DataTables_Table_0_length select')));
    const resultCountSelector = await driver.findElement(By.css('#DataTables_Table_0_length select'));
    await driver.executeScript("arguments[0].scrollIntoView(true);", resultCountSelector);
    await resultCountSelector.click();
    await driver.findElement(By.css('#DataTables_Table_0_length select > option[value="-1"]')).click();
    await driver.wait(until.elementLocated(By.css('a.salesorderButton')));
    const orderLinks = await driver.findElements(By.css('a.salesorderButton'));

    console.log(`Found ${orderLinks.length} orders.`);

    const data = [];

    const currentWindow = await driver.getWindowHandle();
    for (const orderLink of orderLinks) {
        await driver.switchTo().window(currentWindow);
        await orderLink.click();
        const windows = (await driver.getAllWindowHandles()).filter(win => win !== currentWindow);
        if (windows.length !== 1) {
            throw `Unexpected new window count: ${windows.length}`;
        }
        await driver.switchTo().window(windows[0]);
        await driver.wait(until.elementLocated(By.css('.ro-cart .ro-subtotal')));
        const orderData = {
            id: await driver.findElement(By.css('#tblOrderHeaderInfo > div > div:nth-child(3) label')).getText(),
            date: await driver.findElement(By.css('#tblOrderHeaderInfo > div > div:nth-child(4) > span:nth-child(2)')).getText()
        };

        this.emit('order', orderData);

        const items = await driver.findElements(By.css('#DataTables_Table_0 > tbody > tr'));
        for (const item of items) {
            const cols = await item.findElements(By.css('td'));
            const links = await item.findElements(By.css('a'));
            const images = await item.findElements(By.css('img'));

            if (cols.length < 11 || links.length < 1 || images.length < 1) {
                continue;
            }

            const pn = (await cols[3].getText()).split('\n');
            this.emit('item', {
                ord: orderData.id,
                dpn: pn[0],
                mpn: pn[1],
                idx: await cols[0].getText(),
                qty: await cols[1].getText(),
                dsc: await cols[6].getText(),
                upr: await cols[10].getText(),
                lnk: await links[0].getAttribute('href'),
                img: await images[0].getAttribute('src')
            });
        }

        driver.close();
    }
};
