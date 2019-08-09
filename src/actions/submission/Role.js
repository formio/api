const Action = require('../../classes/Action');

module.exports = class Role extends Action {
  static info() {
    return {
      name: 'role',
      title: 'Role Assignment',
      group: 'default',
      description: 'Provides the Role Assignment capabilities.',
      priority: 1,
      default: false,
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
        data: { json: options.roles },
        valueProperty: '_id',
        multiple: false,
        validate: {
          required: true
        }
      }
    ]);
  }

  resolve({ data: submission, req }, setActionInfoMessage) {
    // Error if operation type is not valid.
    if (!this.settings.type || (this.settings.type !== 'add' && this.settings.type !== 'remove')) {
      setActionInfoMessage('Invalid setting `type` for the RoleAction; expecting `add` or `remove`.');
      return Promise.reject('Invalid setting `type` for the RoleAction; expecting `add` or `remove`.');
    }

    // Error if association is existing and valid data was not provided.
    if (!(this.settings.role || submission.data.role)) {
      setActionInfoMessage('Missing role for RoleAction association.');
      return Promise.reject('Missing role for RoleAction association. Must specify role to assign in action settings ' +
        'or a form component named `role`');
    }

    let resource = submission.data.submission || submission;

    const roleId = this.settings.role
      ? this.settings.role
      : submission.data.role;

    const availableRoles = this.app.getRoles(req);
    if (!availableRoles.reduce((found, role) => {
      return found || role._id === roleId;
    }, false)) {
      setActionInfoMessage('Invalid role given for Role action.');
      return Promise.reject('Invalid role given for Role action');
    }

    /**
     * Prepare to load existing resource
     */
    if (typeof resource === 'object' && resource.hasOwnProperty('_id')) {
      resource = resource._id;
    }

    return this.app.models.Submission.read({ _id: this.app.db.toID(resource) })
      .then(submission => {
        // Ensure roles is set and an array.
        submission.roles = submission.roles || [];

        let changed = false;
        const index = submission.roles.indexOf(roleId);

        if (this.settings.type === 'remove' && index !== -1) {
          submission.roles.splice(index, 1);
          changed = true;
        }

        if (this.settings.type === 'add' && index === -1) {
          submission.roles.push(roleId);
          changed = true;
        }

        if (changed) {
          this.app.models.Submission.update(submission);
        }
      });
  }
};
