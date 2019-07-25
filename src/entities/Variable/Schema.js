const Schema = require('../../classes/Schema');

module.exports = class Variable extends Schema {
  get name() {
    return 'variable';
  }

  get basePath() {
    return '';
  }

  get schema() {
    return {
      key: {
        type: 'string',
        required: true
      },
      value: {
        type: 'string',
        required: true
      }
    };
  }
};
