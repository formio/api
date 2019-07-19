const Form = require('../../entities/Porter/Form');

module.exports = class Resource extends Form {
  get key() {
    return 'resources';
  }
};
