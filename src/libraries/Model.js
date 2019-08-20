'use strict';

const _ = require('lodash');
const log = require('../log');

module.exports = class Model {
  constructor(schema, db) {
    // @TODO
    // populate (deprecate?)
    // description (what does this do?)

    this.schema = schema;
    this.db = db;
  }

  get db() {
    return this._db;
  }

  set db(db) {
    this._db = db;

    // Ensure the model is initialized before returning any calls.
    if (this._db) {
      this.initialized = this.initialize();
    }
    else {
      // this.initialized = Promise.reject('DB not initialized');
    }
  }

  get name() {
    return this.schema.name;
  }

  get collectionName() {
    return `${this.name  }s`;
  }

  /* Private Functions */

  initialize() {
    return this.db.getCollections()
      .then(collections => {
        if (collections.includes(this.collectionName)) {
          log('debug', `${this.collectionName} collection already exists`);
          return Promise.resolve();
        }
        else {
          log('debug', `${this.collectionName} collection doesn't exist. Creating...`);
          return this.db.createCollection(this.collectionName)
            .then(() => log('debug', `${this.collectionName} collection created successfully`))
            .catch(err => console.error(err));
        }
      })
      .then(() => {
        const promises = [];
        for (const name in this.schema.schema) {
          const field = this.schema.schema[name];
          if (field.index) {
            log('debug', `Ensuring index for ${this.collectionName}.${name}`);
            promises.push(this.db.createIndex(this.collectionName, name));
          }
        }
        if (this.schema.indexes) {
          this.schema.indexes.map(index => {
            log('debug', `Ensure extra index for ${this.collectionName} ${index.name}`);
            promises.push(this.db.createIndex(this.collectionName, index.spec, index.options));
          });
        }
        return Promise.all(promises);
      });
  }

  iterateFields(path, schema, input, doc, execute) {
    const promises = [];
    if (Array.isArray(schema.type) && schema.type.length >= 1) {
      const values = _.get(input, path, []);
      values.forEach((value, index) => {
        if (typeof schema.type[0] === 'object') {
          for (const name in schema.type[0]) {
            promises.push(this.iterateFields(`${path}[${index}].${name}`, schema.type[0][name], input, doc, execute));
          }
        }
        else {
          const field = {
            ...schema,
            type: schema.type[0]
          };
          promises.push(this.iterateFields(`${path}[${index}]`, field, input, doc, execute));
        }
      });
    }
    else if (typeof schema.type === 'object') {
      for (const name in schema.type) {
        promises.push(this.iterateFields(`${path}.${name}`, schema.type[name], input, doc, execute));
      }
    }
    else {
      promises.push(execute(path, schema, _.get(input, path), doc));
    }
    return Promise.all(promises).then(() => doc);
  }

  beforeSave(input, doc) {
    return this.schema.preSave(input, this)
      .then(input => {
        const promises = [];

        // Do _id first so it is available for unique checking.
        if (this.schema.schema.hasOwnProperty('_id')) {
          promises.push(this.iterateFields('_id', this.schema.schema['_id'], input, doc, this.setField.bind(this)));
        }

        for (const path in this.schema.schema) {
          if (path !== '_id') {
            promises.push(this.iterateFields(path, this.schema.schema[path], input, doc, this.setField.bind(this)));
          }
        }
        return Promise.all(promises)
          .then(() => doc);
      });
  }

  setField(path, field, value, doc) {
    return new Promise((resolve, reject) => {
      const async = [];
      // Set default value
      if ((value === null || value === undefined) && field.hasOwnProperty('default')) {
        if (typeof field.default === 'function') {
          value = field.default();
        }
        else {
          value = field.default;
        }
      }

      // Check for read only
      if (field.readOnly) {
        value = _.get(doc, path, value);
      }

      // Use set function
      if (field.hasOwnProperty('set') && typeof field.set === 'function') {
        value = field.set(value);
      }

      // Check type
      if (value !== null && value !== undefined) {
        if (field.hasOwnProperty('type')) {
          switch (field.type) {
            case 'string':
              if (typeof value !== 'string') {
                value = value.toString();
              }
              break;
            case 'number':
              value = parseInt(value);
              break;
            case 'boolean':
              value = !!value;
              break;
            case 'date':
              try {
                value = new Date(value);
              }
              catch (err) {
                if (!field.looseType) {
                  return reject(`'${path}' invalid type`);
                }
              }
              break;
            case 'id':
              try {
                value = this.toID(value);
              }
              catch (err) {
                if (!field.looseType) {
                  return reject(`'${path}' invalid type`);
                }
              }
              break;
            default:
              if (!(value instanceof field.type)) {
                try {
                  /* eslint-disable new-cap */
                  value = new field.type(value);
                  /* eslint-enable new-cap */
                }
                catch (err) {
                  if (!field.looseType) {
                    return reject(`'${path}' invalid type`);
                  }
                }
              }
          }
        }
      }

      // Required
      if (!value && value !== 0 && field.required) {
        return reject(`'${path}' is required`);
      }

      // String options
      if (value && field.type === 'string') {
        if (field.lowercase) {
          value = value.toLowerCase();
        }
        if (field.trim) {
          value = value.trim();
        }
      }

      // Enumarated values.
      if (value && field.hasOwnProperty('enum')) {
        if (!field.enum.includes(value)) {
          return reject(`Invalid enumerated option in '${path}'`);
        }
      }

      // Set the path on the doc
      if (value !== null && value !== undefined) {
        _.set(doc, path, value);
      }

      // Validate the value
      if (field.hasOwnProperty('validate') && Array.isArray(field.validate)) {
        field.validate.forEach(item => {
          if (item.isAsync) {
            async.push(new Promise(resolve => {
              item.validator.call(doc, value, this, (result, message) => resolve(result ? true : message || item.message));
            }));
          }
          else {
            if (!item.validator.call(doc, value, this)) {
              return reject(item.message);
            }
          }
        });
      }

      // Wait for async and check for errors.
      return Promise.all(async).then((result) => {
        result = result.filter(item => item !== true);
        if (result.length) {
          return reject(result[0]);
        }
        return resolve(doc);
      });
    });
  }

  afterLoad(doc) {
    if (!doc) {
      return Promise.resolve(doc);
    }
    const promises = [];
    for (const path in this.schema.schema) {
      promises.push(this.iterateFields(path, this.schema.schema[path], doc, doc, this.getField.bind(this)));
    }
    return Promise.all(promises)
      .then(() => doc);
  }

  getField(path, field, value, doc) {
    // Use get function
    if (field.hasOwnProperty('get') && typeof field.set === 'function') {
      value = field.get(value);
    }

    // Change ids back to strings for simplicity
    if (field.type === 'id') {
      value = value ? value.toString() : value;
    }

    // Set the path on the doc
    if (value !== null && value !== undefined) {
      _.set(doc, path, value);
    }

    return Promise.resolve(doc);
  }

  toID(value) {
    try {
      return this.db.toID(value);
    }
    catch (err) {
      return value;
    }
  }

  /** Public Functions */

  find(query = {}, options = {}) {
    return this.initialized.then(() => {
      return this.db.find(this.collectionName, query, options)
        .then(docs => Promise.all(docs.map(doc => this.afterLoad(doc))));
    });
  }

  findOne(query = {}, options = {}) {
    return this.find(query, options)
      .then(docs => docs[0]);
  }

  count(query) {
    return this.initialized.then(() => {
      return this.db.count(this.collectionName, query);
    });
  }

  create(input) {
    return this.initialized.then(() => {
      return this.beforeSave(input, {})
        .then(doc => {
          return this.db.create(this.collectionName, doc)
            .then(doc => this.afterLoad(doc));
        });
    });
  }

  read(query) {
    return this.initialized.then(() => {
      return this.db.read(this.collectionName, query)
        .then(doc => this.afterLoad(doc));
    });
  }

  update(input) {
    return this.initialized.then(() => {
      return this.read({ _id: this.toID(input._id) }).then(previous => {
        return this.beforeSave(input, previous)
          .then(doc => {
            return this.db.update(this.collectionName, doc)
              .then(doc => this.afterLoad(doc));
          });
      });
    });
  }

  delete(_id) {
    return this.initialized.then(() => {
      return this.db.delete(this.collectionName, _id);
    });
  }
};
