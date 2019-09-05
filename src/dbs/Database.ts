const Model = require('./Model');

// TODO: Convert this to an interface once we move to typescript.
module.exports = class Database {
  constructor() {
    this.Model = Model;
  }

  public toID(id) {
    return id;
  }

  public find(collection, query, options) {
    return Promise.resolve([]);
  }

  public count(collection, query) {
    return Promise.resolve(0);
  }

  public create(collection, doc) {
    return Promise.resolve(doc);
  }

  public read(collection, query) {
    return Promise.resolve(query);
  }

  public update(collection, doc) {
    return Promise.resolve(doc);
  }

  public delete(collection, query) {
    return Promise.resolve();
  }

  public getCollections(collection) {
    return Promise.resolve([]);
  }

  public createCollection(collection, doc) {
    return Promise.resolve(doc);
  }

  public createIndex(collection, field) {
    return Promise.resolve();
  }

  public aggregate(collection, query) {
    return Promise.resolve();
  }
};
