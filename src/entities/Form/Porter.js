const Porter = require('../../classes/Porter');

module.exports = class Form extends Porter {
  get key() {
    return 'forms';
  }

  get model() {
    return this.app.models.Form;
  }

  getMaps(port, query = { type: 'form' }) {
    return super.getMaps(port, query);
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

  cleanUp(forms) {
    const promises = [];

    // Any form/resource refs that referred to items below in the template need to be updated.
    Object.keys(forms).forEach((key) => {
      const form = forms[key];
      if (!this.componentMachineNameToId(form.components)) {
        return;
      }

      promises.push(this.model.read({ _id: this.app.db.toID(this.maps[this.key][key]) })
        .then(doc => {
          doc.components = form.components;
          return this.model.update(doc);
        }));
    });

    return Promise.all(promises);
  }

  import(form) {
    this.mapEntityProperty(form.submissionAccess, 'roles', this.maps.roles);
    this.mapEntityProperty(form.access, 'roles', this.maps.roles);
    this.componentMachineNameToId(form.components);
    return form;
  }

  export(form) {
    this.mapEntityProperty(form.submissionAccess, 'roles', this.maps.roles);
    this.mapEntityProperty(form.access, 'roles', this.maps.roles);
    this.componentMachineNameToId(form.components);
    // Like _.pick()
    const { title, type, name, path, display, action, tags, settings, components, access, submissionAccess } = form;
    return { title, type, name, path, display, action, tags, settings, components, access, submissionAccess };
  }
};
