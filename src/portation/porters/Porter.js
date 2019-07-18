module.exports = class Porter {
  constructor(app) {
    this.app = app;
  }

  get noExport() {
    return false;
  }

  valid(documents) {
    if (typeof documents === 'object' && !(documents instanceof Array)) {
      return true;
    }

    return false;
  }

  transform(document) {
    return document;
  }

  query(document) {
    return {
      $or: [
        {
          machineName: document.machineName,
        }
      ]
    };
  }

  cleanup(documents) {
    return Promise.resolve();
  }

  mapEntityProperty(entities, property, items) {
    if (!entities || !items) {
      return false;
    }

    if (!Array.isArray(entities)) {
      entities = [entities];
    }
    let found = true;

    entities.forEach(entity => {
      if (entity.hasOwnProperty(property)) {
        if (Array.isArray(entity[property])) {
          entity[property] = entity[property].map((prop) =>{
            if (items.hasOwnProperty(prop)) {
              return items[prop]._id;
            }
            found = false;
          });
        }
        else {
          if (items[entity[property]]) {
            const key = entity[property];
            entity[property] = items[key]._id;

            // Support resetting form revision on import.
            if (items[key].hasOwnProperty._vid) {
              entity[`${property}Revision`] = items[key]._vid;
            }
          }
          else {
            found = false;
          }
        }
      }
    });

    return found;
  }

  componentMachineNameToId(components) {
    let changed = false;
    this.app.util.eachComponent(components, (component) => {
      // Update resource machineNames for resource components.
      if ((component.type === 'resource') && this.mapEntityProperty(component, 'resources', this.template.resources)) {
        changed = true;
      }

      // Update the form property on the form component.
      if ((component.type === 'form') && this.mapEntityProperty(component, 'form', { ...this.template.resources, ...this.template.forms })) {
        changed = true;
      }

      // Update resource machineNames for select components with the resource data type.
      if (
        (component.type === 'select') &&
        (component.dataSrc === 'resource') &&
        this.mapEntityProperty(component.data, 'resources', { ...this.template.resources, ...this.template.forms })
      ) {
        changed = true;
      }
    });

    return changed;
  }
};
