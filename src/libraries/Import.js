'use strict';

module.exports = class Import {
  constructor(app, porters, template) {
    this.app = app;
    this.template = template;
    this.maps = {};
  }

  import() {
    // First load in all maps of existing entities.
    return Promise.all(this.app.porters.map(Porter => {
      const entity = new Porter(this.app);
      return entity.getMaps('import').then(map => {
        this.maps[entity.key] = map;
      });
    }))
      .then(() => {
        // Reducing promises causes them to be called in order and wait for the previous promise to complete.
        return this.app.porters.reduce((prev, Porter) => {
          const entity = new Porter(this.app, this.maps);
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
      });
  }

  importItem(machineName, item, entity) {
    const document = entity.import(item);

    // If no document was returned by import, skip it.
    if (!document) {
      return Promise.resolve();
    }

    document.machineName = machineName;

    // If no document was provided after the alter, skip the insertion.
    if (!document) {
      return Promise.reject(`No document was given to install (${machineName})`);
    }

    return entity.model.findOne(entity.query(document))
      .then(doc => {
        if (!doc) {
          return entity.model.create(document)
            .then(doc => this.maps[entity.key][machineName] = doc._id);
        }
        else if (!entity.createOnly) {
          return entity.model.update(document)
            .then(doc => this.maps[entity.key][machineName] = doc._id);
        }
      });
  }
};
