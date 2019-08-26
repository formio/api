'use strict';

module.exports = class Export {
  constructor(app, req) {
    this.app = app;
    this.req = req;
  }

  export() {
    this.app.log('debug', 'Starting export');
    // First load in all maps of existing entities.
    const maps = {};
    return Promise.all(this.app.porters.map(Porter => {
      const entity = new Porter(this.app);
      this.app.log('debug', `Build map of ${entity.key}`);
      return entity.getMaps('export').then(map => {
        maps[entity.key] = map;
        this.app.log('debug', `Map of ${entity.key} found ${Object.keys(map).length}`);
      });
    }))
      .then(() => {
        // Start the export process.
        return this.exportBase()
          .then(template => {
            // Reducing promises causes them to be called in order and wait for the previous promise to complete.
            return this.app.porters.reduce((prev, Porter) => {
              const entity = new Porter(this.app, maps);
              this.app.log('debug', `Exporting ${entity.key}`);
              return prev.then(() => {
                if (entity.noExport) {
                  return Promise.resolve(template);
                }
                template[entity.key] = template[entity.key] || {};
                return entity.model.find(this.query(entity.key, {}))
                  .then(documents => {
                    documents.forEach(document => {
                      this.app.log('debug', `Exporting ${entity.key} - ${entity.exportMachineName(document)}`);
                      template[entity.key][entity.exportMachineName(document)] = entity.export(document, this.req);
                    });
                    this.app.log('debug', `Exporting ${entity.key} complete`);
                    return Promise.resolve(template);
                  });
              });
            }, Promise.resolve()).then((template) => {
              this.app.log('debug', 'Export complete');
              return template;
            });
          });
      });
  }

  exportBase() {
    return Promise.resolve({
      title: 'Export',
      version: '2.0.0',
      description: '',
      name: 'export',
      roles: {},
      forms: {},
      actions: {},
      resources: {}
    });
  }

  query(type, query) {
    if (type === 'forms') {
      query.type = 'form';
    }
    if (type === 'resources') {
      query.type = 'resource';
    }
    return query;
  }
};
