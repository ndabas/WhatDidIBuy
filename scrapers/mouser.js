'use strict';

const EventEmitter = require('events');
const { By, until } = require('selenium-webdriver');

module.exports = exports = new EventEmitter();

exports.scrape = async function (driver) {
    await driver.get('https://www.mouser.com/');
    // Trying to jump directly to the order history page and looking for the orders table
    // seems to trigger an anti-bot message
    await driver.wait(until.urlContains('OrderHistory/OrdersView.aspx'));
    await driver.wait(until.elementLocated(By.css('#tblOrders > tbody > tr')));

    const orderLinkElements = await driver.findElements(By.css('#tblOrders > tbody > tr > td:nth-child(2) > a'));
    const orderLinks = [];
    for (const elem of orderLinkElements) {
        orderLinks.push(await elem.getAttribute('href'));
    }

    console.log(`Found ${orderLinks.length} orders.`);

    const data = [];

    for (const orderLink of orderLinks) {
        await driver.get(orderLink);
        await driver.wait(until.elementLocated(By.css('#ctl00_ContentMain_SummaryInfo_trOrderTotal')));
        const orderData = {
            id: await driver.findElement(By.css('#ctl00_ContentMain_OrderDetailHeader_lblSalesOrderNumber')).getText(),
            date: await driver.findElement(By.css('#ctl00_ContentMain_OrderDetailHeader_lblOrderDateHeader')).getText()
        };

        this.emit('order', orderData);

        const items = await driver.findElements(By.css('#ctl00_ContentMain_CartGrid_grid > tbody > tr[data-index]'));
        let idx = 1;
        for (const item of items) {
            const cols = await item.findElements(By.css('td'));
            const links = await item.findElements(By.css('a'));

            if (cols.length < 11 || links.length < 1) {
                continue;
            }

            this.emit('item', {
                ord: orderData.id,
                dpn: await cols[3].getText(),
                mpn: await cols[5].getText(),
                idx: idx++,
                qty: await cols[9].getText(),
                dsc: await cols[7].getText(),
                upr: await cols[10].getText(),
                lnk: await links[0].getAttribute('href')
            });
        }
    }
};
