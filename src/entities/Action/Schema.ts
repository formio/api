const Schema = require('../../dbs/Schema');

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
      entity: {
        type: 'id',
        index: true,
        required: true
      },
      entityType: {
        type: 'string',
        index: true,
        required: true,
        default: 'form'
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
      machineName: this.machineName
    };
  }

  generateMachineName(document, model) {
    if (document.machineName) {
      return Promise.resolve(document);
    }

    return this.app.models.Form.findOne({ _id: this.app.db.toID(document.entity), deleted: { $eq: null } })
      .then((form) => {
        if (!form) {
          document.machineName = `${document.entity}:${document.name}`;
          return this.uniqueMachineName(document, model);
        }

        document.machineName = `${form.name}:${document.name}`;
        return this.uniqueMachineName(document, model);
      });
  }
};
