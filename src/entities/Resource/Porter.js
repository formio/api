const Form = require('../Form/Porter');

module.exports = class Resource extends Form {
  get key() {
    return 'resources';
  }

  getMaps(port, query = { type: 'resource' }) {
    return super.getMaps(port, query);
  }
};
