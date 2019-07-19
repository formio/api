module.exports = class Porter {
  constructor(app, maps) {
    this.app = app;
    this.maps = maps;
  }

  get noExport() {
    return false;
  }

  get createOnly() {
    return false;
  }

  // Load all documents from the database and create a map of them.
  getMaps(port, query = {}) {
    return this.model.find(query)
      .then(documents => documents.reduce((map, document) => {
        if (port === 'export') {
          map[document._id] = this.machineName(document);
        }
        else { // export
          map[this.machineName(document)] = document._id;
        }
        return map;
      }, {}));
  }

  valid(documents) {
    if (typeof documents === 'object' && !(documents instanceof Array)) {
      return true;
    }

    return false;
  }

  import(document) {
    return document;
  }

  export(document) {
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

  cleanUp() {
    return Promise.resolve();
  }

  machineName(document) {
    return document.machineName || document.name;
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
              return items[prop];
            }
            found = false;
          });
        }
        else {
          if (items[entity[property]]) {
            const key = entity[property];
            entity[property] = items[key];

            // TODO: Support resetting form revision on import.
            // if (items[key].hasOwnProperty._vid) {
            //   entity[`${property}Revision`] = items[key];
            // }
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
      if ((component.type === 'resource') && this.mapEntityProperty(component, 'resources', this.maps.resources)) {
        changed = true;
      }

      // Update the form property on the form component.
      if ((component.type === 'form') && this.mapEntityProperty(component, 'form', { ...this.maps.resources, ...this.maps.forms })) {
        changed = true;
      }

      // Update resource machineNames for select components with the resource data type.
      if (
        (component.type === 'select') &&
        (component.dataSrc === 'resource') &&
        this.mapEntityProperty(component.data, 'resources', { ...this.maps.resources, ...this.maps.forms })
      ) {
        changed = true;
      }
    });

    return changed;
  }
};
