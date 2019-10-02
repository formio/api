import {Schema} from '../../classes';

import {formio} from '../../util/formio';
import {lodash as _} from '../../util/lodash';

const uniqueMessage = 'may only contain letters, numbers, hyphens, and forward slashes ' +
  '(but cannot start or end with a hyphen or forward slash)';

const invalidRegex = /[^0-9a-zA-Z\-\/]|^\-|\-$|^\/|\/$/;
const validKeyRegex = /^[A-Za-z_]+[A-Za-z0-9\-._]*$/g;
const validShortcutRegex = /^([A-Z]|Enter|Esc)$/i;

const componentKeys = (components) => {
  const keys = [];
  formio.eachComponent(components, (component) => {
    if (!_.isUndefined(component.key) && !_.isNull(component.key)) {
      keys.push(component.key);
    }
  }, true);
  return keys;
};

const componentPaths = (components) => {
  const paths = [];
  formio.eachComponent(components, (component, path) => {
    if (component.input && !_.isUndefined(component.key) && !_.isNull(component.key)) {
      paths.push(path);
    }
  }, true);
  return paths;
};

const componentShortcuts = (components) => {
  const shortcuts = [];
  formio.eachComponent(components, (component) => {
    if (component.shortcut) {
      shortcuts.push(_.capitalize(component.shortcut));
    }
    if (component.values) {
      component.values.forEach((value) => {
        const shortcut = _.get(value, 'shortcut');
        if (shortcut) {
          shortcuts.push(_.capitalize(shortcut));
        }
      });
    }
  }, true);
  return shortcuts;
};

const keyError = '';
const shortcutError = '';

export class Form extends Schema {
  get name() {
    return 'form';
  }

  get basePath() {
    return '';
  }

  get schema() {
    return {
      _id: this.id,
      title: {
        type: 'string',
        description: 'The title for the form.',
        required: true,
      },
      name: {
        type: 'string',
        description: 'The machine name for this form.',
        required: true,
        validate: [
          {
            message: `The Name ${uniqueMessage}`,
            validator: (value) => !invalidRegex.test(value),
          },
          {
            isAsync: true,
            message: 'The Name must be unique.',
            validator: this.uniqueValidator('name'),
          },
        ],
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
            validator: (value) => !invalidRegex.test(value),
          },
          {
            message: 'Path cannot end in `submission` or `action`',
            validator: (path) => !path.match(/(submission|action)\/?$/),
          },
          {
            isAsync: true,
            message: 'The Path must be unique.',
            validator: this.uniqueValidator('path'),
          },
        ],
      },
      type: {
        type: 'string',
        enum: ['form', 'resource'],
        required: true,
        default: 'form',
        description: 'The form type.',
        index: true,
      },
      display: {
        type: 'string',
        description: 'The display method for this form',
      },
      action: {
        type: 'string',
        description: 'A custom action URL to submit the data to.',
      },
      tags: {
        type: ['string'],
        index: true,
      },
      access: this.permissions,
      submissionAccess: this.permissions,
      owner: {
        type: 'id',
        looseType: true,
        ref: 'submission',
        index: true,
        default: null,
        get: (owner) => {
          return owner ? owner.toString() : owner;
        },
      },
      components: {
        // type: [Object],
        description: 'An array of components within the form.',
        validate: [
          {
            message: keyError,
            validator: (components) => componentKeys(components).reduce((valid, key) => valid && key.match(validKeyRegex), true),
          },
          {
            message: shortcutError,
            validator: (components) => componentShortcuts(components)
              .every((shortcut) => shortcut.match(validShortcutRegex)),
          },
          {
            isAsync: true,
            validator: (components, model, valid) => {
              const paths = componentPaths(components);
              const msg = 'Component keys must be unique: ';
              const uniq = _.uniq(paths);
              const diff = paths.filter((value, index, collection) => collection.includes(value, index + 1));

              if (_.isEqual(paths, uniq)) {
                return valid(true);
              }

              return valid(false, (msg + diff.join(', ')));
            },
          },
          {
            isAsync: true,
            validator: (components, model, valid) => {
              const shortcuts = componentShortcuts(components);
              const msg = 'Component shortcuts must be unique: ';
              const uniq = _.uniq(shortcuts);
              const diff = shortcuts.filter((value, index, collection) => collection.includes(value, index + 1));

              if (_.isEqual(shortcuts, uniq)) {
                return valid(true);
              }

              return valid(false, (msg + diff.join(', ')));
            },
          },
        ],
      },
      settings: {
        type: Object,
        description: 'Custom form settings object.',
      },
      properties: {
        type: Object,
        description: 'Custom form properties.',
      },
      ...super.schema,
    };
  }
}
