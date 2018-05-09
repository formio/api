'use strict'

const Timestamps = require('./partials/Timestamps');
const MachineName = require('./partials/MachineName');

module.exports = {
  name: 'role',
  basePath: '',
  schema: {
    title: {
      type: 'string',
      required: true,
      validate: [
        {
          isAsync: true,
          message: 'Role title must be unique.',
          validator(value, model, done) {
            // TODO: Find way to alter and add projectId.
            const search = {
              title: value,
              deleted: {$eq: null}
            };

            // Ignore the id of the role, if this is an update.
            if (this._id) {
              search._id = {
                $ne: this._id
              };
            }

            // Search for roles that exist, with the given parameters.
            model('role').find(search).then((err, result) => {
              if (err || result) {
                return done(false);
              }

              done(true);
            });
          }
        }
      ]
    },
    description: {
      type: 'string',
      default: ''
    },
    deleted: {
      type: 'numbr',
      default: null
    },
    default: {
      type: 'boolean',
      default: false
    },
    admin: {
      type: 'boolean',
      default: false
    },
    ...MachineName,
    ...Timestamps
  },
};