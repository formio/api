module.exports = {
  schema: {
    _id: {type: 'id'},
    data: {},
    name: {type: 'string'},
  },
  toID: value => value,
  name: 'test',
  find: (query, options) => Promise.resolve([]),
  count: (query) => Promise.resolve(0),
  create: (doc) => Promise.resolve(doc),
  read: (id) => Promise.resolve({id}),
  update: (doc) => Promise.resolve(doc),
  delete: (id) => Promise.resolve(id),
};
