'use strict';

const EventEmitter = require('events');
const { By, until } = require('selenium-webdriver');

module.exports = exports = new EventEmitter();

exports.scrape = async function (driver) {
    await driver.get('https://www.arrow.com/');
    await driver.wait(until.urlContains('/account/order/order-history'));
    await driver.wait(until.elementLocated(By.css('table > tbody > tr > td.id')));

    const orderIds = await driver.findElements(By.css('table > tbody > tr > td.id'));
    const orderLinks = [];
    for (const elem of orderIds) {
        orderLinks.push(`https://www.arrow.com/services/orders/${await elem.getText()}?format=json&cacheBusting=${new Date().getTime()}`);
    }

    console.log(`Found ${orderLinks.length} orders.`);

    const data = [];

    for (const orderLink of orderLinks) {
        await driver.get(orderLink);
        const order = JSON.parse(await driver.findElement(By.tagName('pre')).getText());
        const orderData = {
            id: order.no,
            date: new Date(order.orderDate)
        };

        this.emit('order', orderData);

        for (const item of order.webItems) {
            this.emit('item', {
                ord: orderData.id,
                mpn: item.detail.mpn,
                mfr: item.detail.manufacturerName,
                idx: item.lineNo,
                qty: item.quantity,
                dsc: item.description,
                upr: item.unitPrice
            });
        }
    }
};
