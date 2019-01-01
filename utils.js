// https://github.com/paulirish/headless-cat-n-mouse/blob/master/apply-evasions.js
/**
 * @param page { import("puppeteer").Page }
 */
exports.hideWebDriver = async (page) => {
  await page.evaluateOnNewDocument(() => {
    const newProto = navigator.__proto__;
    delete newProto.webdriver;
    navigator.__proto__ = newProto;
  });
};

/**
 * @param page { import("puppeteer").Page }
 */
exports.downloadBlob = async (page, url, init) => {
  const data = await page.evaluate(async (url, init) => {
    const resp = await window.fetch(url, init);
    const data = await resp.blob();
    const reader = new FileReader();
    return new Promise(resolve => {
      reader.addEventListener('loadend', () => resolve({
        url: reader.result,
        mime: resp.headers.get('Content-Type')
      }));
      reader.readAsDataURL(data);
    });
  }, url, init);
  return { buffer: Buffer.from(data.url.split(',')[1], 'base64'), mime: data.mime };
};
