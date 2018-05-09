const MachineName = require('./partials/MachineName');

module.exports = {
  name: 'action',
  basePath: '/form/:formId',
  schema: {
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
    deleted: {
      type: 'number',
      index: true,
      default: null
    },
    ...MachineName
  }
};