const EventEmitter = require('events');

/**
 * @typedef {Object} Order
 * @property {string=} site
 * @property {string} id
 * @property {string=} date
 * @property {string=} status
 */

/**
 * @typedef {Object} Item
 * @property {string=} site
 * @property {string} ord
 * @property {number=} idx
 * @property {string=} dpn
 * @property {string=} mpn
 * @property {string=} mfr
 * @property {string=} qty
 * @property {string=} dsc
 * @property {string=} upr
 * @property {string=} lnk
 * @property {string=} img
 */

/**
 * @typedef {Object} Invoice
 * @property {string=} id
 * @property {string} ord
 * @property {string} mime
 * @property {Buffer} buffer
 */

/**
 * @typedef {import("puppeteer").Browser} Browser
 */

/**
 * @typedef {Object} ScrapeOptions
 * @property {boolean} downloadInvoices
 */

class Scraper extends EventEmitter {
  /**
   *
   * @param {Order} order
   */
  order(order) {
    this.emit('order', order);
  }

  /**
   *
   * @param {Item} item
   */
  item(item) {
    this.emit('item', item);
  }

  /**
   *
   * @param {Invoice} invoice
   */
  invoice(invoice) {
    this.emit('invoice', invoice);
  }

  /**
   *
   * @param {Browser} browser
   * @param {ScrapeOptions} options
   * @return {Promise}
   */
  async scrape(browser, options) {
  }
}

module.exports = Scraper;
