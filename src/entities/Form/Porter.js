const Porter = require('../_portation/Porter');

module.exports = class Form extends Porter {
  get key() {
    return 'forms';
  }

  get model() {
    return this.app.models.Form;
  }

  transform(resource) {
    this.mapEntityProperty(resource.submissionAccess, 'roles', this.template.roles);
    this.mapEntityProperty(resource.access, 'roles', this.template.roles);
    this.componentMachineNameToId(resource.components);
    return resource;
  }

  query(document) {
    return {
      $or: [
        {
          machineName: document.machineName,
          deleted: { $eq: null }
        },
        {
          name: document.name,
          deleted: { $eq: null }
        },
        {
          path: document.path,
          deleted: { $eq: null }
        }
      ]
    };
  }

  // cleanUp(resources) {
  //   const model = formio.resources.form.model;
  //
  //   async.forEachOf(resources, (resource, machineName, next) => {
  //     if (!componentMachineNameToId(template, resource.components)) {
  //       return next();
  //     }
  //
  //     debug.cleanUp(`Need to update resource component _ids for`, machineName);
  //     model.findOneAndUpdate(
  //       {_id: resource._id, deleted: {$eq: null}},
  //       {components: resource.components},
  //       {new: true}
  //     ).lean().exec((err, doc) => {
  //       if (err) {
  //         return next(err);
  //       }
  //       if (!doc) {
  //         return next();
  //       }
  //
  //       resources[machineName] = doc;
  //       debug.cleanUp(`Updated resource component _ids for`, machineName);
  //       next();
  //     });
  //   }, done);
  // }

  // cleanUp(forms) {
  //   const model = formio.resources.form.model;
  //
  //   async.forEachOf(forms, (form, machineName, next) => {
  //     if (!componentMachineNameToId(template, form.components)) {
  //       return next();
  //     }
  //
  //     debug.cleanUp(`Need to update form component _ids for`, machineName);
  //     model.findOneAndUpdate(
  //       {_id: form._id, deleted: {$eq: null}},
  //       {components: form.components},
  //       {new: true}
  //     ).lean().exec((err, doc) => {
  //       if (err) {
  //         return next(err);
  //       }
  //       if (!doc) {
  //         return next();
  //       }
  //
  //       forms[machineName] = doc;
  //       debug.cleanUp(`Updated form component _ids for`, machineName);
  //       next();
  //     });
  //   }, done);
  // }

  export(document) {
    // Like _.pick()
    const { title, type, name, path, display, action, tags, settings, components, access, submissionAccess } = document;
    return { title, type, name, path, display, action, tags, settings, components, access, submissionAccess };
  }
};
