const Action = require('../Action');

module.exports = class Role extends Action {
  static info() {
    return {
      name: 'role',
      title: 'Role Assignment',
      group: 'default',
      description: 'Provides the Role Assignment capabilities.',
      priority: 1,
      defaults: {
        handler: ['after'],
        method: ['create']
      },
      access: {
        handler: false,
        method: false
      }
    };
  }

  static settingsForm(options) {
    return super.settingsForm(options, [
      {
        type: 'select',
        input: true,
        label: 'Action Type',
        key: 'type',
        placeholder: 'Select whether this Action will Add or Remove the contained Role.',
        template: '<span>{{ item.title }}</span>',
        dataSrc: 'json',
        data: {
          json: JSON.stringify([
            {
              type: 'add',
              title: 'Add Role'
            },
            {
              type: 'remove',
              title: 'Remove Role'
            }
          ])
        },
        valueProperty: 'type',
        multiple: false,
        validate: {
          required: true
        }
      },
      {
        type: 'select',
        input: true,
        label: 'Role',
        key: 'role',
        placeholder: 'Select the Role that this action will Add or Remove.',
        template: '<span>{{ item.title }}</span>',
        dataSrc: 'json',
        data: {json: options.roles},
        valueProperty: '_id',
        multiple: false,
        validate: {
          required: true
        }
      }
    ]);
  }

  resolve(handler, method, req, res, event) {
    return Promise.resolve();
  }
};
