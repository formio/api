const vm = require('vm');
const Joi = require('joi');
const _ = require('lodash');

const getRules = (type) => [
  {
    name: 'custom',
    params: {
      component: Joi.any(),
      data: Joi.any()
    },
    validate(params, value, state, options) {
      const component = params.component;
      const data = params.data;
      let row = state.parent;
      let valid = true;

      if (!_.isArray(row)) {
        row = [row];
      }

      // If a component has multiple rows of data, e.g. Datagrids, validate each row of data on the backend.
      for (let b = 0; b < row.length; b++) {
        const _row = row[b];

        // Try a new sandboxed validation.
        try {
          // Replace with variable substitutions.
          const replace = /({{\s{0,}(.*[^\s]){1}\s{0,}}})/g;
          component.validate.custom = component.validate.custom.replace(replace, (match, $1, $2) =>  _.get(data, $2));

          // Create the sandbox.
          const sandbox = vm.createContext({
            input: _.isObject(_row) ? util.getValue({data: _row}, component.key) : _row,
            data,
            row: _row,
            scope: {data},
            component: component,
            valid: valid
          });

          // Execute the script.
          const script = new vm.Script(component.validate.custom);
          script.runInContext(sandbox, {
            timeout: 100
          });
          valid = sandbox.valid;
        }
        catch (err) {
          // Say this isn't valid based on bad code executed...
          valid = err.toString();
        }

        // If there is an error, then set the error object and break from iterations.
        if (valid !== true) {
          return this.createError(`${type}.custom`, {message: valid}, state, options);
        }
      }

      return value; // Everything is OK
    }
  },
  {
    name: 'json',
    params: {
      component: Joi.any(),
      data: Joi.any()
    },
    validate(params, value, state, options) {
      const component = params.component;
      const data = params.data;
      let row = state.parent;
      let valid = true;

      if (!_.isArray(row)) {
        row = [row];
      }

      // If a component has multiple rows of data, e.g. Datagrids, validate each row of data on the backend.
      for (let b = 0; b < row.length; b++) {
        const _row = row[b];

        try {
          valid = util.jsonLogic.apply(component.validate.json, {
            data,
            row: _row
          });
        }
        catch (err) {
          valid = err.message;
        }

        // If there is an error, then set the error object and break from iterations.
        if (valid !== true) {
          return this.createError(`${type}.json`, {message: valid}, state, options);
        }
      }

      return value; // Everything is OK
    }
  },
  {
    name: 'hidden',
    params: {
      component: Joi.any(),
      data: Joi.any()
    },
    validate(params, value, state, options) {
      // If we get here than the field has thrown an error.
      // If we are hidden, sanitize the data and return true to override the error.
      // If not hidden, return an error so the original error remains on the field.

      const component = params.component;
      const data = params.data;
      const row = state.parent;

      const isVisible = checkConditional(component, row, data, true);

      if (isVisible) {
        return value;
      }

      return this.createError(`${type}.hidden`, {message: 'hidden with value'}, state, options);
    }
  },
  {
    name: 'select',
    params: {
      component: Joi.any(),
      submission: Joi.any(),
      token: Joi.any(),
      async: Joi.any()
    },
    validate(params, value, state, options) {
      // Empty values are fine.
      if (!value) {
        return value;
      }

      const component = params.component;
      const submission = params.submission;
      const token = params.token;
      const async = params.async;

      // Initialize the request options.
      const requestOptions = {
        url: _.get(component, 'validate.select'),
        method: 'GET',
        qs: {},
        json: true,
        headers: {}
      };

      // If the url is a boolean value.
      if (util.isBoolean(requestOptions.url)) {
        requestOptions.url = util.boolean(requestOptions.url);
        if (!requestOptions.url) {
          return value;
        }

        if (component.dataSrc !== 'url') {
          return value;
        }

        if (!component.data.url || !component.searchField) {
          return value;
        }

        // Get the validation url.
        requestOptions.url = component.data.url;

        // Add the search field.
        requestOptions.qs[component.searchField] = value;

        // Add the filters.
        if (component.filter) {
          requestOptions.url += (!requestOptions.url.includes('?') ? '?' : '&') + component.filter;
        }

        // If they only wish to return certain fields.
        if (component.selectFields) {
          requestOptions.qs.select = component.selectFields;
        }
      }

      if (!requestOptions.url) {
        return value;
      }

      // Make sure to interpolate.
      requestOptions.url = FormioUtils.interpolate(requestOptions.url, {
        data: submission.data
      });

      // Set custom headers.
      if (component.data && component.data.headers) {
        _.each(component.data.headers, (header) => {
          if (header.key) {
            requestOptions.headers[header.key] = header.value;
          }
        });
      }

      // Set form.io authentication.
      if (component.authenticate && token) {
        requestOptions.headers['x-jwt-token'] = token;
      }

      async.push(new Promise((resolve, reject) => {
        // Make the request.
        request(requestOptions, (err, response, body) => {
          if (err) {
            return resolve({
              message: `Select validation error: ${err}`,
              path: state.path,
              type: 'any.select'
            });
          }

          if (response && parseInt(response.statusCode / 100, 10) !== 2) {
            return resolve({
              message: `Select validation error: ${body}`,
              path: state.path,
              type: 'any.select'
            });
          }

          if (!body || !body.length) {
            return resolve({
              message: `"${value}" for "${component.label || component.key}" is not a valid selection.`,
              path: state.path,
              type: 'any.select'
            });
          }

          // This is a valid selection.
          return resolve(null);
        });
      }));

      return value;
    }
  },
  {
    name: 'distinct',
    params: {
      component: Joi.any(),
      submission: Joi.any(),
      model: Joi.any(),
      async: Joi.any()
    },
    validate(params, value, state, options) {
      const component = params.component;
      const submission = params.submission;
      const model = params.model;
      const async = params.async;

      const path = `data.${state.path.join('.')}`;

      // Allow empty.
      if (!value) {
        return value;
      }
      if (_.isEmpty(value)) {
        return value;
      }

      // Get the query.
      const query = {form: util.idToBson(submission.form)};
      if (_.isString(value)) {
        query[path] = {$regex: new RegExp(`^${util.escapeRegExp(value)}$`), $options: 'i'};
      }
      // FOR-213 - Pluck the unique location id
      else if (
        !_.isString(value) &&
        value.hasOwnProperty('address_components') &&
        value.hasOwnProperty('place_id')
      ) {
        query[`${path}.place_id`] = {$regex: new RegExp(`^${util.escapeRegExp(value.place_id)}$`), $options: 'i'};
      }
      // Compare the contents of arrays vs the order.
      else if (_.isArray(value)) {
        query[path] = {$all: value};
      }
      else if (_.isObject(value)) {
        query[path] = {$eq: value};
      }

      // Only search for non-deleted items.
      if (!query.hasOwnProperty('deleted')) {
        query['deleted'] = {$eq: null};
      }

      async.push(new Promise((resolve, reject) => {
        // Try to find an existing value within the form.
        model.findOne(query, (err, result) => {
          if (err) {
            return resolve({
              message: err,
              path: state.path,
              type: 'any.unique'
            });
          }
          else if (result && submission._id && (result._id.toString() === submission._id)) {
            // This matches the current submission which is allowed.
            return resolve(null);
          }
          else if (result) {
            return resolve({
              message: `"${component.label}" must be unique.`,
              path: state.path,
              type: 'any.unique'
            });
          }
          return resolve(null);
        });
      }));

      return value; // Everything is OK
    }
  }
];

module.exports = Joi.extend([
  {
    name: 'any',
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('any')
  },
  {
    name: 'string',
    base: Joi.string(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('string')
  },
  {
    name: 'array',
    base: Joi.array(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('array')
  },
  {
    name: 'object',
    base: Joi.object(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('object')
  },
  {
    name: 'number',
    base: Joi.number(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('number')
  },
  {
    name: 'boolean',
    base: Joi.boolean(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('boolean')
  },
  {
    name: 'date',
    base: Joi.date(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}'
    },
    rules: getRules('date')
  }
]);

