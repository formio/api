export class Schema {
  public app;

  constructor(app) {
    this.app = app;
  }

  get schema(): any {
    return {
      created: this.created,
      modified: this.modified,
      machineName: this.machineName,
    };
  }

  get name() {
    return 'schema';
  }

  get index(): any {
    return false;
  }

  get id() {
    return {
      type: 'id',
    };
  }

  get created() {
    return {
      type: 'date',
      description: 'The date this resource was created.',
      default: Date.now,
      readonly: true,
    };
  }

  get modified() {
    return {
      type: 'date',
      description: 'The date this resource was modified.',
      default: Date.now,
      readonly: true,
    };
  }

  get access() {
    // Define the available permissions for a submission.
    const available = [
      'read',
      'write',
      'admin',
    ];

    return [
      {
        _id: false,
        type: {
          type: 'string',
          enum: available,
          required: 'A permission type is required to associate an available permission with a Resource.',
        },
        resources: {
          type: 'id',
          ref: 'form',
        },
      },
    ];
  }

  get externalIds() {
    return [
      {
        type: {
          type: 'string',
        },
        resource: {
          type: 'string',
        },
        id: {
          type: 'string',
        },
      },
    ];
  }

  get enumPermissions() {
    return [
      'create_all',
      'read_all',
      'update_all',
      'delete_all',
      'create_own',
      'read_own',
      'update_own',
      'delete_own',
      'self',
    ];
  }

  get permissions() {
    return [
      {
        type: {
          type: 'string',
          enum: this.enumPermissions,
          required: 'A permission type is required to associate an available permission with a given role.',
        },
        roles: {
          type: 'id',
          ref: 'role',
        },
      },
    ];
  }

  get machineName() {
    return {
      type: 'string',
      description: 'A unique, exportable name.',
      readonly: true,
      index: true,
    };
  }

  public preSave(item, model) {
    item.access = item.access || [];
    item.submissionAccess = item.submissionAccess || [];
    // If there is no machine name or it is an existing item, don't set.
    if (!this.schema.machineName || (item._id && item.machineName)) {
      return Promise.resolve(item);
    }

    return this.generateMachineName(item, model);
  }

  public generateMachineName(document, model) {
    if (document.machineName) {
      return Promise.resolve(document);
    }
    document.machineName = document.name;
    return this.uniqueMachineName(document, model);
  }

  public uniqueMachineName(document, model) {
    const query: any = {
      machineName: { $regex: `^${document.machineName}[0-9]*$` },
      deleted: { $eq: null },
    };
    if (document._id) {
      query._id = { $ne: this.app.db.toID(document._id) };
    }

    return model.find(query)
      .then((records) => {
        if (!records || !records.length) {
          return document;
        }

        let i = 0;
        records.forEach((record) => {
          const parts = record.machineName.split(/(\d+)$/).filter(Boolean);
          const number = parseInt(parts[1], 10) || 0;
          if (number > i) {
            i = number;
          }
        });
        document.machineName += ++i;

        return document;
      });
  }

  public uniqueValidator(property) {
    return function(value, model, done) {
      const query = model.schema.uniqueQuery(this, model);
      query[property] = value;

      // Ignore the id if this is an update.
      if (this._id) {
        query._id = { $ne: model.db.toID(this._id) };
      }

      model.find(query)
        .then((result) => {
          done(!result.length);
        })
        .catch((err) => {
          done(false);
        });
    };
  }

  public uniqueQuery(doc, model) {
    return {};
  }
};
