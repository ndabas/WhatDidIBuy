// https://github.com/paulirish/headless-cat-n-mouse/blob/master/apply-evasions.js
/**
 * @param page { import("puppeteer").Page }
 */
exports.hideWebDriver = async page => {
  await page.evaluateOnNewDocument(() => {
    // @ts-ignore: Property '__proto__' does not exist on type 'Navigator'.
    const newProto = navigator.__proto__;
    delete newProto.webdriver;
    // @ts-ignore: Property '__proto__' does not exist on type 'Navigator'.
    navigator.__proto__ = newProto;
  });
};

/**
 * @param page { import("puppeteer").Page }
 * @param {RequestInfo} input
 * @param {RequestInit=} init
 */
exports.downloadBlob = async (page, input, init) => {
  const data = await page.evaluate(async (input, init) => {
    const resp = await window.fetch(input, init);
    const data = await resp.blob();
    const reader = new FileReader();
    return new Promise(resolve => {
      reader.addEventListener('loadend', () => resolve({
        url: reader.result,
        mime: resp.headers.get('Content-Type')
      }));
      reader.readAsDataURL(data);
    });
  }, input, init);
  return { buffer: Buffer.from(data.url.split(',')[1], 'base64'), mime: data.mime };
};
