let util = require('formiojs/utils');

// Fix weirdness between module import systems.
if (util.hasOwnProperty('default')) {
  util = util.default;
}

module.exports = {
  ...util,
};
