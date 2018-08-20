const Action = require('./Action');

module.exports = class Login extends Action {
  static info(req, res, next) {
    next(null, {
      name: 'save',
      title: 'Save Submission',
      description: 'Saves the submission into the database.',
      priority: 10,
      defaults: {
        handler: ['before'],
        method: ['create', 'update']
      },
      access: {
        handler: false,
        method: false
      }
    });
  }

  static settingsForm(req, res, next) {
    next(null, [
      {
        type: 'resourcefields',
        key: 'resource',
        title: 'Save submission to',
        placeholder: 'This form',
        basePath: hook.alter('path', '/form', req),
        form: req.params.formId,
        required: false
      }
    ]);
  }

  resolve(handler, method, req, res) {
    req.skipResource = false;
    return Promise.resolve();
  }
};
