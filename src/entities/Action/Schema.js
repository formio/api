const Schema = require('../../Classes/Schema');

module.exports = class Action extends Schema {
  get name() {
    return 'action';
  }

  get basePath() {
    return '/form/:formId';
  }

  get schema() {
    return {
      title: {
        type: 'string',
        required: true
      },
      name: {
        type: 'string',
        required: true
      },
      handler: [{
        type: 'string',
        require: true
      }],
      method: [{
        type: 'string',
        require: true
      }],
      condition: {
        required: false
      },
      priority: {
        type: 'number',
        require: true,
        default: 0
      },
      settings: {
        required: false
      },
      form: {
        type: 'id',
        ref: 'form',
        index: true,
        required: true
      },
      machineName: this.machineName
    };
  }
};
