const Form = require('../Form/Porter');

module.exports = class Resource extends Form {
  get key() {
    return 'resources';
  }

  public getMaps(port, query = { type: 'resource' }) {
    return super.getMaps(port, query);
  }
};
