const Model = require('./Model');

// TODO: Convert this to an interface once we move to typescript.
module.exports = class Database {
  constructor() {
    this.Model = Model;
  }

  toID(id) {
    return id;
  }

  find(collection, query, options) {
    return Promise.resolve([]);
  }

  count(collection, query) {
    return Promise.resolve(0);
  }

  create(collection, doc) {
    return Promise.resolve(doc);
  }

  read(collection, query) {
    return Promise.resolve(query);
  }

  update(collection, doc) {
    return Promise.resolve(doc);
  }

  delete(collection, query) {
    return Promise.resolve();
  }

  getCollections(collection) {
    return Promise.resolve([]);
  }

  createCollection(collection, doc) {
    return Promise.resolve(doc);
  }

  createIndex(collection, field) {
    return Promise.resolve();
  }

  aggregate(collection, query) {
    return Promise.resolve();
  }
};
