import {Porter} from '../../classes/Porter';

export class Form extends Porter {
  get key() {
    return 'forms';
  }

  get model() {
    return this.app.models.Form;
  }

  public getMaps(port, query = { type: 'form' }) {
    return super.getMaps(port, query);
  }

  public query(document: any): any {
    return {
      $or: [
        {
          machineName: document.machineName,
        },
        {
          name: document.name,
        },
        {
          path: document.path,
        },
      ],
    };
  }

  public cleanUp(forms): any {
    const promises = [];

    // Any form/resource refs that referred to items below in the template need to be updated.
    Object.keys(forms).forEach((key) => {
      const form = forms[key];
      if (!this.componentMachineNameToId(form.components)) {
        return;
      }

      promises.push(this.model.read({ _id: this.app.db.toID(this.maps[this.key][key]) })
        .then((doc) => {
          doc.components = form.components;
          return this.model.update(doc);
        }));
    });

    return Promise.all(promises);
  }

  public import(form) {
    this.mapEntityProperty(form.submissionAccess, 'roles', this.maps.roles);
    this.mapEntityProperty(form.access, 'roles', this.maps.roles);
    this.componentMachineNameToId(form.components);
    return form;
  }

  public export(form) {
    this.mapEntityProperty(form.submissionAccess, 'roles', this.maps.roles);
    this.mapEntityProperty(form.access, 'roles', this.maps.roles);
    this.componentMachineNameToId(form.components);
    // Like _.pick()
    const { title, type, name, path, display, action, tags, settings, components, access, submissionAccess } = form;
    return { title, type, name, path, display, action, tags, settings, components, access, submissionAccess };
  }
}
