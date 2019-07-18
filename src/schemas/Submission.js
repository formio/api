const Timestamps = require('./partials/Timestamps');
const AccessSchema = require('./partials/AccessSchema');
const ExternalIdSchema = require('./partials/ExternalIdSchema');

module.exports = {
  name: 'submission',
  basePath: '/form/:formId',
  schema: {
    form: {
      type: 'id',
      index: true,
      required: true
    },
    owner: {
      index: true,
      default: null,
      looseType: true,
      get: owner => {
        return owner ? owner.toString() : owner;
      }
    },

    // The roles associated with this submission, if any.
    // Useful for complex custom resources.
    roles: {
      type: ['id'],
      index: true
    },

    // The access associated with this submission.
    // Useful for complex custom permissions.
    access: {
      type: [AccessSchema],
      index: true
    },

    // An array of external Id's.
    externalIds: [ExternalIdSchema],

    // Configurable meta data associated with a submission.
    metadata: {
      description: 'Configurable metadata.'
    },

    // The data associated with this submission.
    data: {
      required: true
    },
    ...Timestamps
  },
  indexes: [
    {
      name: 'deleted',
      spec: {
        deleted: 1
      },
      options: {
        partialFilterExpression: { deleted: { $eq: null } }
      }
    },
    {
      name: 'query',
      spec: {
        form: 1,
        deleted: 1,
        created: -1
      },
      options: null
    }
  ]
};
