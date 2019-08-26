'use strict';

module.exports = class Import {
  constructor(app, template, req) {
    this.app = app;
    this.template = template;
    this.req = req;
    this.maps = {};
  }

  async import(query) {
    this.app.log('debug', 'Starting import');

    // First load in all maps of existing entities.
    await Promise.all(this.app.porters.map(Porter => {
      const entity = new Porter(this.app);
      this.app.log('debug', `Build map of ${entity.key}`);
      return entity.getMaps('import', query).then(map => {
        this.maps[entity.key] = map;
        this.app.log('debug', `Map of ${entity.key} found ${Object.keys(map).length}`);
      });
    }));

    // Reducing promises causes them to be called in order and wait for the previous promise to complete.
    await this.app.porters.reduce((prev, Porter) => {
      const entity = new Porter(this.app, this.maps);
      this.app.log('debug', `Importing ${entity.key}`);
      return prev.then(() => {
        const items = entity.root ? { [this.template.name]: this.template } : this.template[entity.key] || {};

        // Ensure the definitions are valid.
        if (!entity.valid(items)) {
          this.app.log('warning', `The given entities was not valid: ${entity.key || 'project'}`);
          return Promise.reject(`The given entities was not valid: ${entity.key || 'project'}`);
        }

        return Promise.all(Object.keys(items)
          .map(machineName => this.importItem(machineName, items[machineName], entity))
        )
          .then((docs) => entity.postImport(docs, this.req))
          .then(() => this.app.log('debug', `Importing ${entity.key} complete`));
      });
    }, Promise.resolve());

    // Go through again and run cleanups.
    await this.app.porters.reduce((prev, Porter) => {
      const entity = new Porter(this.app, this.maps);
      this.app.log('debug', `Cleanup ${entity.key}`);
      return prev.then(() => {
        const items = entity.root ? { [this.template.name]: this.template } : this.template[entity.key] || {};

        return entity.cleanUp(items)
          .then(() => this.app.log('debug', `Cleanup ${entity.key} complete`));
      });
    }, Promise.resolve());
  }

  importItem(machineName, item, entity) {
    this.app.log('debug', `Importing ${entity.key} - ${machineName}`);
    const document = entity.import(item, this.req);

    // If no document was returned by import, skip it.
    if (!document) {
      return Promise.resolve();
    }

    document.machineName = entity.importMachineName(machineName, this.req);

    // If no document was provided after the alter, skip the insertion.
    if (!document) {
      return Promise.reject(`No document was given to install (${machineName})`);
    }

    return entity.model.findOne(entity.query(document))
      .then(doc => {
        if (!doc) {
          return entity.model.create(document)
            .then(doc => {
              this.maps[entity.key][machineName] = doc._id;
              return doc;
            });
        }
        else if (!entity.createOnly) {
          document._id = doc._id;
          return entity.model.update(document)
            .then(doc => {
              this.maps[entity.key][machineName] = doc._id;
              return doc;
            });
        }
        else {
          this.maps[entity.key][machineName] = doc._id;
          return Promise.resolve(doc);
        }
      });
  }
};
