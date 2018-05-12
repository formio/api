const Timestamps = require('./partials/Timestamps');
const MachineName = require('./partials/MachineName');
const PermissionSchema = require('./partials/PermissionSchema');

const uniqueMessage = 'may only contain letters, numbers, hyphens, and forward slashes ' +
  '(but cannot start or end with a hyphen or forward slash)';
const uniqueValidator = property => function(value, model, done) {
  // TODO: Have a way to alter to add projectId.
  const query = {deleted: {$eq: null}};
  query[property] = value;

  // Ignore the id if this is an update.
  if (this._id) {
    search._id = {$ne: this._id};
  }

  model('form').find(search).then((err, result) => {
    if (err) {
      return done(false);
    }

    done(true);
  });
};

const keyError = '';
const shortcutError = '';

module.exports = {
  name: 'form',
  basePath: '',
  schema: {
    title: {
      type: 'string',
      description: 'The title for the form.',
      required: true
    },
    name: {
      type: 'string',
      description: 'The machine name for this form.',
      required: true,
      validate: [
        {
          message: `The Name ${uniqueMessage}`,
          validator: (value) => !invalidRegex.test(value)
        },
        {
          isAsync: true,
          message: 'The Name must be unique.',
          validator: uniqueValidator('name')
        }
      ]
    },
    path: {
      type: 'string',
      description: 'The path for this resource.',
      index: true,
      required: true,
      lowercase: true,
      trim: true,
      validate: [
        {
          message: `The Path ${uniqueMessage}`,
          validator: (value) => !invalidRegex.test(value)
        },
        {
          message: 'Path cannot end in `submission` or `action`',
          validator: (path) => !path.match(/(submission|action)\/?$/)
        },
        {
          isAsync: true,
          message: 'The Path must be unique.',
          validator: uniqueValidator('path')
        }
      ]
    },
    type: {
      type: 'string',
      enum: ['form', 'resource'],
      required: true,
      default: 'form',
      description: 'The form type.',
      index: true
    },
    display: {
      type: 'string',
      description: 'The display method for this form'
    },
    action: {
      type: 'string',
      description: 'A custom action URL to submit the data to.'
    },
    tags: {
      type: ['string'],
      index: true
    },
    access: [PermissionSchema],
    submissionAccess: [PermissionSchema],
    owner: {
      type: 'id',
      looseType: true,
      ref: 'submission',
      index: true,
      default: null,
      get: owner => {
        return owner ? owner.toString() : owner;
      }
    },
    components: {
      type: [Object],
      description: 'An array of components within the form.',
      validate: [
        {
          message: keyError,
          validator: (components) => componentKeys(components).every((key) => key.match(validKeyRegex))
        },
        {
          message: shortcutError,
          validator: (components) => componentShortcuts(components)
            .every((shortcut) => shortcut.match(validShortcutRegex))
        },
        {
          isAsync: true,
          validator: (components, valid) => {
            const paths = componentPaths(components);
            const msg = 'Component keys must be unique: ';
            const uniq = paths.uniq();
            const diff = paths.filter((value, index, collection) => _.includes(collection, value, index + 1));

            if (_.isEqual(paths.value(), uniq.value())) {
              return valid(true);
            }

            return valid(false, (msg + diff.value().join(', ')));
          }
        },
        {
          isAsync: true,
          validator: (components, valid) => {
            const shortcuts = componentShortcuts(components);
            const msg = 'Component shortcuts must be unique: ';
            const uniq = shortcuts.uniq();
            const diff = shortcuts.filter((value, index, collection) => _.includes(collection, value, index + 1));

            if (_.isEqual(shortcuts.value(), uniq.value())) {
              return valid(true);
            }

            return valid(false, (msg + diff.value().join(', ')));
          }
        }
      ]
    },
    settings: {
      type: Object,
      description: 'Custom form settings object.'
    },
    properties: {
      type: Object,
      description: 'Custom form properties.'
    },
    ...MachineName,
    ...Timestamps
  }
};