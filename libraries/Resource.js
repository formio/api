'use strict';

const jsonpatch = require('fast-json-patch');

module.exports = class Resource {
  constructor(model, router, options = {}) {
    this.options = options;
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

  getFindQuery(req) {
    const findQuery = {};

    // Get the filters and omit the limit, skip, select, and sort.
    var filters = _.omit(req.query, 'limit', 'skip', 'select', 'sort', 'populate');

    // Iterate through each filter.
    _.each(filters, (value, name) => {

      // Get the filter object.
      var filter = _.zipObject(['name', 'selector'], name.split('__'));

      // See if this parameter is defined in our model.
      var param = this.model.schema.paths[filter.name.split('.')[0]];
      if (param) {

        // See if there is a selector.
        if (filter.selector) {

          // See if this selector is a regular expression.
          if (filter.selector === 'regex') {

            // Set the regular expression for the filter.
            var parts = value.match(/\/?([^/]+)\/?([^/]+)?/);
            var regex = null;
            try {
              regex = new RegExp(parts[1], (parts[2] || 'i'));
            }
            catch (err) {
              debug.query(err);
              regex = null;
            }
            if (regex) {
              findQuery[filter.name] = regex;
            }
            return;
          }
          else {
            // Init the filter.
            if (!findQuery.hasOwnProperty(filter.name)) {
              findQuery[filter.name] = {};
            }

            if (filter.selector === 'exists') {
              value = ((value === 'true') || (value === '1')) ? true : value;
              value = ((value === 'false') || (value === '0')) ? false : value;
              value = !!value;
            }
            // Special case for in filter with multiple values.
            else if ((_.indexOf(['in', 'nin'], filter.selector) !== -1)) {
              value = _.isArray(value) ? value : value.split(',');
              value = _.map(value, (item) => {
                return this.getQueryValue(filter.name, item, param, options);
              });
            }
            else {
              // Set the selector for this filter name.
              value = this.getQueryValue(filter.name, value, param, options);
            }

            findQuery[filter.name]['$' + filter.selector] = value;
            return;
          }
        }
        else {
          // Set the find query to this value.
          value = this.getQueryValue(filter.name, value, param, options);
          findQuery[filter.name] = value;
          return;
        }
      }

      // Set the find query to this value.
      findQuery[filter.name] = value;
    });

    // Return the findQuery.
    return findQuery;
  }

  index(req, res, next) {
    const query = {};
    const options = {
      limit: 10,
      skip: 0
    };
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