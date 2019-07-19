'use strict';

module.exports = class Export {
  constructor(app) {
    this.app = app;
  }

  export() {
    return this.exportBase()
      .then(template => {
        // Reducing promises causes them to be called in order and wait for the previous promise to complete.
        return this.app.porters.reduce((prev, Porter) => {
          const entity = new Porter(this.app);
          return prev.then(() => {
            if (entity.noExport) {
              return Promise.resolve(template);
            }
            template[entity.key] = template[entity.key] || {};
            return entity.model.find(this.query({}))
              .then(documents => {
                documents.forEach(document => {
                  template[entity.key][entity.machineName(document)] = entity.export(document);
                });
                return Promise.resolve(template);
              });
          });
        }, Promise.resolve());
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
    return query;
  }
};
