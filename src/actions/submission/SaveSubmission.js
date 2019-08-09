const Action = require('../../classes/Action');

module.exports = class SaveSubmission extends Action {
  static info() {
    return {
      name: 'save',
      title: 'Save Submission',
      group: 'default',
      description: 'Saves the submission into the database.',
      priority: 10,
      default: true,
      defaults: {
        handler: ['before'],
        method: ['create', 'update']
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
        type: 'resourcefields',
        key: 'resource',
        title: 'Save submission to',
        placeholder: 'This form',
        basePath: options.baseUrl,
        form: '',
        required: false
      }
    ]);
  }

  resolve({ req }, setActionInfoMessage) {
    req.skipResource = false;

    if (this.settings.resource) {
      setActionInfoMessage('Could not Save to resource. Not implemented yet.');
    }

    return Promise.resolve();
  }
};
