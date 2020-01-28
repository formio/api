import {Model} from './Model';

export class Database {
  public Model;
  public ready: Promise<any>;
  protected config;

  constructor(config?) {
    this.Model = Model;
    this.config = config;
  }

  public async connect() {
    return;
  }

  public async disconnect() {
    return;
  }

  public toID(id) {
    return id;
  }

  public find(collection, query, options?): Promise<any> {
    return Promise.resolve([]);
  }

  public count(collection, query, options?): Promise<any> {
    return Promise.resolve(0);
  }

  public create(collection, doc): Promise<any> {
    return Promise.resolve(doc);
  }

  public read(collection, query, options?): Promise<any> {
    return Promise.resolve(query);
  }

  public update(collection, doc, context?): Promise<any> {
    return Promise.resolve(doc);
  }

  public delete(collection, query): Promise<any> {
    return Promise.resolve();
  }

  public getCollections(database?): Promise<any> {
    return Promise.resolve([]);
  }

  public createCollection(collection, schema?, database?): Promise<any> {
    return Promise.resolve();
  }

  public async ensureCollection(name, schema, database = this.config.database) {
    const collections = await this.getCollections(database);
    if (!collections.includes(name)) {
      return await this.createCollection(name, schema, database);
    }
  }

  public createIndex(collection, field, options?, database?): Promise<any> {
    return Promise.resolve();
  }

  public aggregate(collection, query): Promise<any> {
    return Promise.resolve();
  }
}
