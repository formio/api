'use strict';

const jsonpatch = require('fast-json-patch');
const moment = require('moment');

module.exports = class Resource {
  constructor(model, router) {
    this.model = model;
    this.router = router;

    this.rest();
  }

  get name() {
    return this.model.name.toLowerCase();
  }

  get route() {
    return this.name;
  }

  rest() {
    this.register('get', this.route, 'index');
    this.register('post', this.route, 'post');
    this.register('get', this.route + '/:' + this.name + 'Id', 'get');
    this.register('put', this.route + '/:' + this.name + 'Id', 'put');
    this.register('patch', this.route + '/:' + this.name + 'Id', 'patch');
    this.register('delete', this.route + '/:' + this.name + 'Id', 'delete');

    return this;
  }

  register(method, route, callback) {
    this.router[method](route, (req, res, next) => {
      this[callback](req, res, next);
    });
  }

  getQuery(req, query = {}) {
    const {limit, skip, select, sort, populate, ...filters} = req.query || {};

    // Iterate through each filter.
    for (let key in filters) {
      let value = filters[key];
      const [name, selector] = key.split('__');

      // See if this parameter is defined in our model.
      const param = this.model.schema[name.split('.')[0]];

      if (param) {
        if (selector) {
          switch (selector) {
            case 'regex':
              // Set the regular expression for the filter.
              const parts = value.match(/\/?([^/]+)\/?([^/]+)?/);

              try {
                value = new RegExp(parts[1], (parts[2] || 'i'));
              }
              catch (err) {
                value = null;
              }
              query[name] = value;
              break;
            case 'exists':
              value = ((value === 'true') || (value === '1')) ? true : value;
              value = ((value === 'false') || (value === '0')) ? false : value;
              value = !!value;
              query[name] = query[name] || {};
              query[name]['$' + selector] = value;
              break;
            case 'in':
            case 'nin':
              value = Array.isArray(value) ? value : value.split(',');
              value = value.map(item => {
                return this.getQueryValue(name, item, param);
              });
              query[name] = query[name] || {};
              query[name]['$' + selector] = value;
              break;
            default:
              value = this.getQueryValue(name, value, param);
              query[name] = query[name] || {};
              query[name]['$' + selector] = value;
              break;
          }
        }
        else {
          // Set the find query to this value.
          value = this.getQueryValue(name, value, param);
          query[name] = value;
        }
      }
      else {
        // Set the find query to this value.
        query[name] = value;
      }
    }

    return query;
  }

  getQueryValue(name, value, param) {
    if (param.type === 'number') {
      return parseInt(value, 10);
    }

    var date = moment.utc(value, ['YYYY-MM-DD', 'YYYY-MM', moment.ISO_8601], true);
    if (date.isValid()) {
      return date.toDate();
    }

    // If this is an ID, and the value is a string, convert to an ObjectId.
    if (param.type === 'id' && typeof value === 'string') {
      try {
        value = this.model.toID(value);
      }
      catch (err) {
        console.warn(`Invalid ObjectID: ${value}`);
      }
    }

    return value;
  }

  getOptions(req, options = {}) {
    const optionKeys = ['limit', 'skip', 'select', 'sort'];

    optionKeys.forEach(key => {
      if (req.query.hasOwnProperty(key)) {
        switch(key) {
          case 'limit':
          case 'skip':
            options[key] = req.query[key];
            break;
          case 'sort':
          case 'select':
            // Select has changed to projection.
            options[(key === 'select' ? 'projection' : key)] = req.query[key].split(',')
              .map(item => item.trim())
              .reduce((prev, item) => {
                prev[item] = 1;
                return prev;
              }, {});
            break;
        }
      }
    });

    return options;
  }

  index(req, res, next) {
    const query = this.getQuery(req);
    const options = this.getOptions(req);
    Promise.all([
      this.model.count(query),
      this.model.find(query, options)
    ])
      .then(([count, docs]) => {
        res.resource = {
          count,
          items: docs
        };
        next();
      })
      .catch(next);
  }

  post(req, res, next) {
    this.model.create(req.body)
      .then((doc) => {
        res.resource = {
          item: doc
        };
        next();
      })
      .catch(next);
  }

  get(req, res, next) {
    this.model.read({
      _id: req.params[this.name + 'Id']
    })
      .then((doc) => {
        res.resource = {
          item: doc
        };
        next();
      })
      .catch(next);
  }

  put(req, res, next) {
    req.body._id = req.params[this.name + 'Id'];
    this.model.update(req.body)
      .then((doc) => {
        res.resource = {
          item: doc
        };
        next();
      })
      .catch(next);
  }

  patch(req, res, next) {
    this.model.read(req.params[this.name + 'Id'])
      .then(doc => {
        const patched = jsonpatch.applyPatch(doc, req.body);

        // Ensure _id remains the same.
        patched.newDocument._id = req.params[this.name + 'Id'];

        this.model.update(patched.newDocument)
          .then((doc) => {
            res.resource = {
              item: doc
            };
            next();
          });
      })
      .catch(next);
  }

  delete(req, res, next) {
    this.model.delete(req.params[this.name + 'Id'])
      .then((doc) => {
        res.resource = {
          item: doc
        };
        next();
      })
      .catch(next);
  }
};