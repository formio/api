const Schema = require('../../classes/Schema');
const _camelCase = require('lodash/camelCase');

module.exports = class Role extends Schema {
  get name() {
    return 'role';
  }

  get basePath() {
    return '';
  }

  get schema() {
    return {
      _id: this.id,
      title: {
        type: 'string',
        required: true,
        validate: [
          {
            isAsync: true,
            message: 'Role title must be unique.',
            validator: this.uniqueValidator('title')
          }
        ]
      },
      description: {
        type: 'string',
        default: ''
      },
      default: {
        type: 'boolean',
        default: false
      },
      admin: {
        type: 'boolean',
        default: false
      },
      ...super.schema
    };
  }

  generateMachineName(document, model) {
    if (document.machineName) {
      return Promise.resolve(document);
    }

    document.machineName = _camelCase(document.title);
    return this.uniqueMachineName(document, model);
  }
};
