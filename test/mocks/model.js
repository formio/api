module.exports = {
  name: 'test',
  find: (query, options) => Promise.resolve([]),
  count: (query) => Promise.resolve(0),
  create: (doc) => Promise.resolve(doc),
  read: (id) => Promise.resolve({id}),
  update: (doc) => Promise.resolve(doc),
  delete: (id) => Promise.resolve(id),
};