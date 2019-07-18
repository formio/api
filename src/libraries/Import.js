module.exports = class Import {
  constructor(App, template) {
    this.app = App;
    this.template = template;
  }

  // These are in order of import order.
  get entities() {
    return [
      this.role,
      this.resource,
      this.form,
      this.action,
    ];
  }

  // TODO: Should probably turn these entities into classes.
  get role() {
    return {
      key: 'roles',
      model: this.app.models.Role,
      valid: (roles) => {
        if (typeof roles === 'object' && !(roles instanceof Array)) {
          return true;
        }
        return false;
      },
      transform: (role) => role,
      query(document) {
        return {
          $or: [
            {
              machineName: document.machineName,
              deleted: { $eq: null }
            },
            {
              title: document.title,
              deleted: { $eq: null }
            }
          ]
        };
      },
      cleanUp: (roles) => {
        // Add everyone role for later reference.
        roles.everyone = {
          _id: '000000000000000000000000'
        };
        return Promise.resolve();
      }
    };
  }

  get resource() {
    return {
      key: 'resources',
      model: this.app.models.Form,
      valid: (resources) => {
        if (typeof resources === 'object' && !(resources instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (resource) => {
        this.mapEntityProperty(resource.submissionAccess, 'roles', this.template.roles);
        this.mapEntityProperty(resource.access, 'roles', this.template.roles);
        this.componentMachineNameToId(resource.components);
        return resource;
      },
      // cleanUp: (resources) => {
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
      // },
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

    };
  }

  get form() {
    return {
      key: 'forms',
      model: this.app.models.Form,
      valid: (forms) => {
        if (typeof forms === 'object' && !(forms instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (form) => {
        this.mapEntityProperty(form.submissionAccess, 'roles', this.template.roles);
        this.mapEntityProperty(form.access, 'roles', this.template.roles);
        this.componentMachineNameToId(form.components);
        return form;
      },
      // cleanUp: (forms) => {
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
      // },
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
    };
  }

  get action() {
    return {
      key: 'actions',
      model: this.app.models.Action,
      valid: (actions) => {
        if (typeof actions === 'object' && !(actions instanceof Array)) {
          return true;
        }

        return false;
      },
      transform: (action) => {
        this.mapEntityProperty(action.settings, 'resources', this.template.resources);
        this.mapEntityProperty(action.settings, 'role', this.template.roles);
        const formFound = this.mapEntityProperty(action, 'form', this.template.forms);

        // If no changes were made, the form was invalid and we can't insert the action.
        if (!formFound) {
          return undefined;
        }

        return action;
      },
      query(document) {
        return {
          $or: [
            {
              machineName: document.machineName,
            }
          ]
        };
      }
    };
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

  import() {
    // Reducing promises causes them to be called in order and wait for the previous promise to complete.
    return this.entities.reduce((prev, entity) => {
      return prev.then(() => {
        const items = entity.root ? [this.template] : this.template[entity.key] || [];

        // Ensure the definitions are valid.
        if (!entity.valid(items)) {
          return Promise.reject(`The given entities was not valid: ${entity.key || 'project'}`);
        }

        return Promise.all(Object.keys(items)
          .map(machineName => this.importItem(machineName, items[machineName], entity)))
          .then(() => {
            // Run the cleanup function if avilable.
            return (entity.hasOwnProperty('cleanUp') ? entity.cleanUp(items) : Promise.resolve())
              .then(() => {
                if (entity.root) {
                  return Promise.resolve();
                }

                // Load all existing entities in the database.
                return entity.model.find()
                  .then(entities => {
                    entities.forEach(item => {
                      this.template[entity.key][item.machineName] = item;
                    });
                    return Promise.resolve();
                  });
                }
              );
          });
      });
    }, Promise.resolve());
  }

  importItem(machineName, item, entity) {
    const document = entity.hasOwnProperty('transform') ? entity.transform(item) : item;

    // If no document was returned by transform, skip it.
    if (!document) {
      return Promise.resolve();
    }

    document.machineName = machineName;

    // If no document was provided after the alter, skip the insertion.
    if (!document) {
      return Promise.reject(`No document was given to install (${machineName})`);
    }

    const query = entity.query ? entity.query(document) : {
      machineName: document.machineName,
    };

    return entity.model.findOne(query)
      .then(doc => {
        if (!doc) {
          return entity.model.create(document)
            .then(doc => {
              if (entity.key) {
                this.template[entity.key][machineName] = doc;
              }
            });
        }
        else if (!entity.createOnly) {
          return entity.model.save(document)
            .then(doc => {
              if (entity.key) {
                this.template[entity.key][machineName] = doc;
              }
            });
        }
        else {
          // Entity exists already and is create only so just set in template.
          if (entity.key) {
            this.template[entity.key][machineName] = doc;
          }
          return Promise.resolve();
        }
      });
  }
};
