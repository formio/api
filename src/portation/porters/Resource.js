const Form = require('./Form');

module.exports = class Resource extends Form {
  get key() {
    return 'resources';
  }
};
