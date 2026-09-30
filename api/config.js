const { publicConfig, sendJson } = require('./_shared');

module.exports = function handler(request, response) {
  sendJson(response, 200, publicConfig());
};
