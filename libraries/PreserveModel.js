'use strict';

import Model from './Model';

module.exports = class PreserveModel extends Model {
  find(query, options) {
    return this.initialized.then(() => {
      return this.db.find(this.collectionName, query, options)
        .then(docs => Promise.all(docs.map(doc => this.afterLoad(doc))));
    });
  }

  count(query) {
    return this.initialized.then(() => {
      return this.db.count(this.collectionName, query);
    });
  }

  create(input) {
    return this.initialized.then(() => {
      return this.beforeSave(input, {})
        .then(doc => {
          return this.db.create(this.collectionName, doc)
            .then(doc => this.afterLoad(doc));
        });
    });
  }

  read(query) {
    return this.initialized.then(() => {
      return this.db.read(this.collectionName, query)
        .then(doc => this.afterLoad(doc));
    });
  }

  update(input) {
    return this.initialized.then(() => {
      return this.read(input._id).then(previous => {
        return this.beforeSave(input, previous)
          .then(doc => {
            return this.db.update(this.collectionName, doc)
              .then(doc => this.afterLoad(doc));
          });
      });
    });
  }

  delete(_id) {
    return this.initialized.then(() => {
      return this.db.delete(this.collectionName, _id);
    });
  }
};
