const { readAssetsWithFallback, sendJson } = require('./_shared');

module.exports = async function handler(request, response) {
  sendJson(response, 200, await readAssetsWithFallback());
};
