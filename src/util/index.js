const util = require('formiojs/utils');

module.exports = {
  ...util,
  encrypt: require('./encrypt'),
};
