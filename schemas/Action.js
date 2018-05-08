const MachineName = require('./partials/MachineName');

module.exports = {
  name: 'action',
  basePath: '/form/:formId',
  schema: {
    title: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    handler: [{
      type: String,
      require: true
    }],
    method: [{
      type: String,
      require: true
    }],
    condition: {
      required: false
    },
    priority: {
      type: Number,
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
      type: Number,
      index: true,
      default: null
    },
    ...MachineName
  }
};