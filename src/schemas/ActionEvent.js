const MachineName = require('./partials/MachineName');

module.exports = {
  name: 'event',
  basePath: '/',
  schema: {
    title: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true
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
    state: {
      type: 'string',
      enum: ['new', 'executed', 'error'],
      required: true,
      default: 'new',
      description: 'The form type.',
    },
    errors: {
      type: ['string']
    }
  }
};
