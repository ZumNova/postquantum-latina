const artifact = require('../config/router-probe-artifact.json');
const { sendJson } = require('./_shared');

module.exports = function handler(request, response) {
  sendJson(response, 200, artifact);
};
