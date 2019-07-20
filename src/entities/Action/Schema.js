const Schema = require('../../Classes/Schema');

module.exports = class Action extends Schema {
  get name() {
    return 'action';
  }

  get basePath() {
    return '/form/:formId';
  }

  get schema() {
    return {
      _id: this.id,
      title: {
        type: 'string',
        required: true
      },
      name: {
        type: 'string',
        required: true
      },
      handler: [{
        type: 'string',
        require: true
      }],
      method: [{
        type: 'string',
        require: true
      }],
      condition: {
        required: false
      },
      priority: {
        type: 'number',
        require: true,
        default: 0
      },
      settings: {
        required: false
      },
      form: {
        type: 'id',
        ref: 'form',
        index: true,
        required: true
      },
      machineName: this.machineName
    };
  }

  generateMachineName(document, model) {
    return this.app.models.Form.findOne({ _id: this.app.db.toID(document.form), deleted: { $eq: null } })
      .then((form) => {
        if (!form) {
          document.machineName = `${document.form}:${document.name}`;
          return this.uniqueMachineName(document, model);
        }

        document.machineName = `${form.name}:${document.name}`;
        return this.uniqueMachineName(document, model);
      });
  }
};
