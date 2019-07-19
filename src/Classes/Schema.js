'use strict';

module.exports = class Schema {
  constructor(app) {
    this.app = app;
  }

  get schema() {
    return {
      create: this.created,
      modified: this.modified,
      machineName: this.machineName,
    };
  }

  get index() {
    return false;
  }

  get created() {
    return {
      type: 'date',
      description: 'The date this resource was created.',
      default: Date.now,
      readonly: true
    };
  }

  get modified() {
    return {
      type: 'date',
      description: 'The date this resource was modified.',
      default: Date.now,
      readonly: true
    };
  }

  get access() {
    // Define the available permissions for a submission.
    const available = [
      'read',
      'write',
      'admin'
    ];

    return {
      _id: false,
      type: {
        type: 'string',
        enum: available,
        required: 'A permission type is required to associate an available permission with a Resource.'
      },
      resources: {
        type: 'id',
        ref: 'form'
      }
    };
  }

  get externalIds() {
    return [
      {
        type: {
          type: 'string'
        },
        resource: {
          type: 'string'
        },
        id: {
          type: 'string'
        }
      }
    ];
  }

  get permissions() {
    const available = [
      'create_all',
      'read_all',
      'update_all',
      'delete_all',
      'create_own',
      'read_own',
      'update_own',
      'delete_own',
      'self'
    ];

    return [
      {
        type: {
          type: 'string',
          enum: available,
          required: 'A permission type is required to associate an available permission with a given role.'
        },
        roles: {
          type: 'id',
          ref: 'role'
        }
      }
    ];
  }

  get machineName() {
    return {
      type: 'string',
      description: 'A unique, exportable name.',
      readonly: true,
      index: true,
      preSave() {
        // Do not alter an already established machine name.
        // if (this._id && this.machineName) {
        //   return next();
        // }
        // const model = formio.mongoose.model(modelName);
        // if (typeof schema.machineName !== 'function') {
        //   return util.uniqueMachineName(this, model, next);
        // }
        // schema.machineName(this, (err, machineName) => {
        //   if (err) {
        //     return next(err);
        //   }
        //
        //   this.machineName = machineName;
        //   util.uniqueMachineName(this, model, next);
        // });
        return Promise.resolve();
      }
    };
  }
};
