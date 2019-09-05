const vm = require('vm');
const Joi = require('joi');
const _ = require('lodash');
const request = require('request-promise-native');
const cache = require('memory-cache');
const util = require('../../util');

/*
 * Returns true or false based on visibility.
 *
 * @param {Object} component
 *   The form component to check.
 * @param {Object} row
 *   The local data to check.
 * @param {Object} data
 *   The full submission data.
 */
const checkConditional = (component, row, data, recurse = false) => {
  let isVisible = true;

  if (!component || !component.hasOwnProperty('key')) {
    return isVisible;
  }

  // Custom conditional logic. Need special case so the eval is isolated in a sandbox
  if (component.customConditional) {
    try {
      // Create the sandbox.
      const sandbox = vm.createContext({
        data,
        row,
      });

      // Execute the script.
      const script = new vm.Script(component.customConditional);
      script.runInContext(sandbox, {
        timeout: 250,
      });

      if (util.isBoolean(sandbox.show)) {
        isVisible = util.boolean(sandbox.show);
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    try {
      isVisible = util.checkCondition(component, row, data);
    } catch (err) {
      console.error(err);
    }
  }

  // If visible and recurse, continue down tree to check parents.
  if (isVisible && recurse && component.parent.type !== 'form') {
    return !component.parent || checkConditional(component.parent, row, data, true);
  } else {
    return isVisible;
  }
};

const getRules = (type) => [
  {
    name: 'custom',
    params: {
      component: Joi.any(),
      data: Joi.any(),
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
            input: _.isObject(_row) ? util.getValue({ data: _row }, component.key) : _row,
            data,
            row: _row,
            scope: { data },
            component,
            valid,
          });

          // Execute the script.
          const script = new vm.Script(component.validate.custom);
          script.runInContext(sandbox, {
            timeout: 100,
          });
          valid = sandbox.valid;
        } catch (err) {
          // Say this isn't valid based on bad code executed...
          valid = err.toString();
        }

        // If there is an error, then set the error object and break from iterations.
        if (valid !== true) {
          return this.createError(`${type}.custom`, { message: valid }, state, options);
        }
      }

      return value; // Everything is OK
    },
  },
  {
    name: 'json',
    params: {
      component: Joi.any(),
      data: Joi.any(),
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
            row: _row,
          });
        } catch (err) {
          valid = err.message;
        }

        // If there is an error, then set the error object and break from iterations.
        if (valid !== true) {
          return this.createError(`${type}.json`, { message: valid }, state, options);
        }
      }

      return value; // Everything is OK
    },
  },
  {
    name: 'hidden',
    params: {
      component: Joi.any(),
      data: Joi.any(),
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

      return this.createError(`${type}.hidden`, { message: 'hidden with value' }, state, options);
    },
  },
  {
    name: 'maxWords',
    params: {
      maxWords: Joi.any(),
    },
    validate(params, value, state, options) {
      if (value.trim().split(/\s+/).length <= parseInt(params.maxWords, 10)) {
        return value;
      }

      return this.createError(`${type}.maxWords`, { message: 'exceeded maximum words.' }, state, options);
    },
  },
  {
    name: 'minWords',
    params: {
      minWords: Joi.any(),
    },
    validate(params, value, state, options) {
      if (value.trim().split(/\s+/).length >= parseInt(params.minWords, 10)) {
        return value;
      }

      return this.createError(`${type}.minWords`, { message: 'does not have enough words.' }, state, options);
    },
  },
  {
    name: 'select',
    params: {
      component: Joi.any(),
      submission: Joi.any(),
      token: Joi.any(),
      async: Joi.any(),
      requests: Joi.any(),
    },
    /* eslint-disable no-unused-vars */
    validate(params, value, state, options) {
      /* eslint-enable no-unused-vars */
      // Empty values are fine.
      if (!value) {
        return value;
      }

      const component = params.component;
      const submission = params.submission;
      const token = params.token;
      const async = params.async;
      const requests = params.requests;

      // Initialize the request options.
      const requestOptions = {
        url: _.get(component, 'validate.select'),
        method: 'GET',
        qs: {},
        json: true,
        headers: {},
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
      requestOptions.url = util.interpolate(requestOptions.url, {
        data: submission.data,
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

      async.push(new Promise((resolve) => {
        /* eslint-disable prefer-template */
        const cacheKey = `${requestOptions.method}:${requestOptions.url}?` +
          Object.keys(requestOptions.qs).map((key) => key + '=' + requestOptions.qs[key]).join('&');
        /* eslint-enable prefer-template */
        const cacheTime = (process.env.VALIDATOR_CACHE_TIME || (3 * 60)) * 60 * 1000;

        // Check if this request was cached
        const result = cache.get(cacheKey);
        if (result !== null) {
          // Null means no cache hit but is also used as a success callback which we are faking with true here.
          if (result === true) {
            return resolve(null);
          } else {
            return resolve(result);
          }
        }

        // Us an existing promise or create a new one.
        requests[cacheKey] = requests[cacheKey] || request(requestOptions);

        requests[cacheKey]
          .then((body) => {
            if (!body || !body.length) {
              const error = {
                message: `"${value}" for "${component.label || component.key}" is not a valid selection.`,
                path: state.path,
                type: 'any.select',
              };
              cache.put(cacheKey, error, cacheTime);
              return resolve(error);
            }

            cache.put(cacheKey, true, cacheTime);
            return resolve(null);
          })
          .catch((result) => {
            const error = {
              message: `Select validation error: ${result.error}`,
              path: state.path,
              type: 'any.select',
            };
            cache.put(cacheKey, error, cacheTime);
            return resolve(error);
          });
      }));

      return value;
    },
  },
  {
    name: 'distinct',
    params: {
      component: Joi.any(),
      submission: Joi.any(),
      model: Joi.any(),
      async: Joi.any(),
    },
    /* eslint-disable no-unused-vars */
    validate(params, value, state, options) {
      /* eslint-enable no-unused-vars */
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
      const query = { form: util.idToBson(submission.form) };
      if (_.isString(value)) {
        query[path] = { $regex: new RegExp(`^${util.escapeRegExp(value)}$`), $options: 'i' };
      } else if (
        !_.isString(value) &&
        value.hasOwnProperty('address_components') &&
        value.hasOwnProperty('place_id')
      ) {
        query[`${path}.place_id`] = { $regex: new RegExp(`^${util.escapeRegExp(value.place_id)}$`), $options: 'i' };
      } else if (_.isArray(value)) {
        query[path] = { $all: value };
      } else if (_.isObject(value)) {
        query[path] = { $eq: value };
      }

      // Only search for non-deleted items.
      if (!query.hasOwnProperty('deleted')) {
        query.deleted = { $eq: null };
      }

      async.push(new Promise((resolve) => {
        // Try to find an existing value within the form.
        model.findOne(query, (err, result) => {
          if (err) {
            return resolve({
              message: err,
              path: state.path,
              type: 'any.unique',
            });
          } else if (result && submission._id && (result._id.toString() === submission._id)) {
            // This matches the current submission which is allowed.
            return resolve(null);
          } else if (result) {
            return resolve({
              message: `"${component.label}" must be unique.`,
              path: state.path,
              type: 'any.unique',
            });
          }
          return resolve(null);
        });
      }));

      return value; // Everything is OK
    },
  },
];

const JoiX = Joi.extend([
  {
    name: 'any',
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}',
    },
    rules: getRules('any'),
  },
  {
    name: 'string',
    base: Joi.string(),
    language: {
      custom: '{{message}}',
      maxWords: '{{message}}',
      minWords: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}',
    },
    rules: getRules('string'),
  },
  {
    name: 'array',
    base: Joi.array(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}',
    },
    rules: getRules('array'),
  },
  {
    name: 'object',
    base: Joi.object(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}',
    },
    rules: getRules('object'),
  },
  {
    name: 'number',
    base: Joi.number(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}',
    },
    rules: getRules('number'),
  },
  {
    name: 'boolean',
    base: Joi.boolean(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}',
    },
    rules: getRules('boolean'),
  },
  {
    name: 'date',
    base: Joi.date(),
    language: {
      custom: '{{message}}',
      json: '{{message}}',
      hidden: '{{message}}',
      select: '{{message}}',
      distinct: '{{message}}',
    },
    rules: getRules('date'),
  },
]);

module.exports = {
  checkConditional,
  JoiX,
};
