// https://github.com/paulirish/headless-cat-n-mouse/blob/master/apply-evasions.js
exports.hideWebDriver = async (page) => {
  await page.evaluateOnNewDocument(() => {
    const newProto = navigator.__proto__;
    delete newProto.webdriver;
    navigator.__proto__ = newProto;
  });
};
