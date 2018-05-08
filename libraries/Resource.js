'use strict';

const jsonpatch = require('fast-json-patch');
const ObjectID = require('mongodb').ObjectID;

module.exports = class Resource {
  constructor(model, basePath, router, options) {
    this.basePath = basePath;
    this.model = model;
    this.router = router;
    this.rest(options);
  }

  get name() {
    return this.model.name.toLowerCase();
  }

  get route() {
    return this.basePath + '/' + this.name;
  }

  get collection() {
    return this.name + 's';
  }

  rest(options) {
    return this
      .index(options)
      .post(options)
      .get(options)
      .put(options)
      .patch(options)
      .delete(options);
  }

  register(method, route, callback) {
    this.router[method](route, callback);
  }

  index(collection, options) {
    this.register('get', this.route, (req, res, next) => {
      const query = {};
      const options = {
        limit: 10,
        skip: 0
      };
      Promise.all([
        this.model.count(this.collection, query),
        this.model.find(this.collection, query, options)
      ])
        .then(([count, docs]) => {
          res.resource = {
            count,
            items: docs
          };
          next();
        });
    });
    return this;
  }

  post(options) {
    this.register('post', this.route, (req, res, next) => {
      this.model.create(this.collection, req.body)
        .then((doc) => {
          res.resource = {
            item: doc
          };
          next();
        });
    });
    return this;
  }

  get(options) {
    this.register('get', this.route + '/:' + this.name + 'Id', (req, res, next) => {
      this.model.read(this.collection, {
        _id: ObjectID(req.params[this.name + 'Id'])
      })
        .then((doc) => {
          res.resource = {
            item: doc
          };
          next();
        });
    });
    return this;
  }

  put(options) {
    this.register('put', this.route + '/:' + this.name + 'Id', (req, res, next) => {
      this.model.update(this.collection, req.body)
        .then((doc) => {
          res.resource = {
            item: doc
          };
          next();
        });
    });
    return this;
  }

  patch(options) {
    this.register('patch', this.route + '/:' + this.name + 'Id', (req, res, next) => {
      this.model.read(this.collection, req.body._id)
        .then(doc => {
          const patched = jsonpatch.apply(doc, req.body);
          this.model.update(this.collection, patched)
            .then((doc) => {
              res.resource = {
                item: doc
              };
              next();
            });
        });
    });
    return this;
  }

  delete(options) {
    this.register('delete', this.route + '/:' + this.name + 'Id', (req, res, next) => {
      this.model.delete(this.collection, req.body)
        .then((doc) => {
          res.resource = {
            item: doc
          };
          next();
        });
    });
    return this;
  }
};