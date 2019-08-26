import Model from './Model';

export default class Database {
  Model = Model
  toID = id => id
  find = (collection, query, options) => Promise.resolve([])
  count = (collection, query) => Promise.resolve(0)
  create = (collection, doc) => Promise.resolve(doc)
  read = (collection, query) => Promise.resolve(query)
  update = (collection, doc) => Promise.resolve(doc)
  delete = (collection, query) => Promise.resolve()
  getCollections = (collection) => Promise.resolve([])
  createCollection = (collection, doc) => Promise.resolve(doc)
  createIndex = (collection, field) => Promise.resolve()
  aggregate = (collection, query) => Promise.resolve()
}
