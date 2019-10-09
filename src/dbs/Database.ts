import {Model} from './Model';

export class Database {
  public Model;
  public ready: Promise<any>;
  protected config;

  constructor(config?) {
    this.Model = Model;
    this.config = config;
  }

  public toID(id) {
    return id;
  }

  public find(collection, query, options?) {
    return Promise.resolve([]);
  }

  public count(collection, query, options?) {
    return Promise.resolve(0);
  }

  public create(collection, doc) {
    return Promise.resolve(doc);
  }

  public read(collection, query) {
    return Promise.resolve(query);
  }

  public update(collection, doc, context?) {
    return Promise.resolve(doc);
  }

  public delete(collection, query) {
    return Promise.resolve();
  }

  public getCollections(collection?) {
    return Promise.resolve([]);
  }

  public createCollection(collection, doc?) {
    return Promise.resolve(doc);
  }

  public createIndex(collection, field, options?, database?) {
    return Promise.resolve();
  }

  public aggregate(collection, query) {
    return Promise.resolve();
  }
}
