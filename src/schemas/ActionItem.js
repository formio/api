const Timestamps = require('./partials/Timestamps');

module.exports = {
  name: 'actionItem',
  basePath: '/',
  schema: {
    title: {
      type: 'string',
      require: true
    },
    form: {
      type: 'id',
      ref: 'form',
      index: true,
      required: true
    },
    submission: {
      type: 'id',
      ref: 'submission',
      index: true,
      required: false
    },
    action: {
      type: 'string',
      require: true
    },
    handler: {
      type: 'string',
      require: true
    },
    method: {
      type: 'string',
      require: true
    },
    state: {
      type: 'string',
      enum: ['new', 'inprogress', 'complete', 'error'],
      required: true,
      default: 'new',
      description: 'The current status of this event.',
    },
    messages: {},
    data: {},
    ...Timestamps,
  }
};
