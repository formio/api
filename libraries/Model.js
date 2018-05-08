'use strict';

const Joi = require('joi');
const _ = require('lodash');

module.exports = class Model {
  constructor(schema, db) {
    this.db = db;

    // Ensure there is an entry for _id
    schema.schema._id = {
      type: this.db.ID,
    };

    // @TODO
    // populate (deprecate?)
    // get
    // description (what does this do?)
    // type [String]
    // type [{schema}]
    // readOnly
    // to string (read)

    this.schema = schema;

    // Ensure the model is initialized before returning any calls.
    this.initialized = this.initialize();
  }

  get name() {
    return this.schema.name;
  }

  get collectionName() {
    return this.name + 's';
  }

  /* Private Functions */

  initialize() {
    return this.db.getCollections()
      .then(collections => {
        if (collections.includes(this.collectionName)) {
          console.log(`${this.collectionName} collection already exists`);
          return Promise.resolve();
        }
        else {
          console.log(`${this.collectionName} collection doesn't exist. Creating...`);
          return this.db.createCollection(this.collectionName)
            .then(() => console.log(`${this.collectionName} collection created successfully`))
            .catch(err => console.error(err));
        }
      })
      .then(() => {
        const promises = [];
        for (const name in this.schema.schema) {
          const field = this.schema.schema[name];
          if (field.index) {
            console.log(`Ensuring index for ${this.collectionName}.${name}`)
            promises.push(this.db.createIndex(this.collectionName, name));
          }
        }
        if (this.schema.indexes) {
          this.schema.indexes.map(index => {
            console.log(`Ensure extra index for ${this.collectionName} ${index.name}`);
            promises.push(this.db.createIndex(this.collectionName, index.spec, index.options));
          });
        }
        return Promise.all(promises);
      });
    // this.applySchema({tags: ['one', 'two'], form: 'Test', name: 'test', path: 'test', 'form': '592346d2cc462910c67c6200', data: {}}, {})
    //   .then(doc => console.log(doc));
  }

  validate(input) {
    const doc = {};
    return new Promise((resolve, reject) => {
      for (const path in this.schema) {
      }
    });
  }

  iterateFields(path, schema, input, doc, execute) {
    const promises = [];
    if (Array.isArray(schema.type) && schema.type.length >= 1) {
      const values = _.get(input, path, []);
      values.forEach((value, index) => {
        const arrayPath = path + '[' + index + ']';
        promises.push(this.setFields(arrayPath, schema.type[0], input, doc, execute));
      });
    }
    else if (typeof schema.type === 'object') {
      for (const name in schema) {
        promises.push(this.setFields(path + (path ? '.' : '') + name, schema[name], input, doc, execute));

        // if (field.type && Array.isArray(field.type) && field.type.length === 1) {
        //   const values = _.get(input, path, []);
        //   values.forEach((value, index) => {
        //     const arrayPath = path + '[' + index + ']';
        //     if (typeof field.type[0] === 'object') {
        //     }
        //     else {
        //       promises.push(execute(arrayPath, field, _.get(input, arrayPath), context));
        //     }
        //   });
        // }
        // else {
        //   promises.push(execute(path, field, _.get(input, path), context));
        // }
      }
    }
    else {
      promises.push(execute(path, schema, _.get(input, path), doc));
    }
    return Promise.all(promises).then(() => doc);
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

      // Use set function
      if (field.hasOwnProperty('set') && typeof field.set === 'function') {
        value = field.set(value);
      }

      // Check type
      if (value !== null && value !== undefined) {
        if (field.hasOwnProperty('type')) {
          switch(field.type) {
            case 'string':
              if (typeof value !== 'string') {
                value = value.toString();
              }
              break;
            case 'integer':
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
              if (!(value instanceof this.db.ID)) {
                try {
                  value = new this.db.ID(value);
                }
                catch (err) {
                  if (!field.looseType) {
                    return reject(`'${path}' invalid type`);
                  }
                }
              }
              break;
            default:
              if (!(value instanceof field.type)) {
                try {
                  value = new field.type(value);
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
      if (!value && field.required) {
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
            };
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
      })
    });
  }

  getField() {

  }

  beforeSave(input, doc) {
    const promises = [];
    for (const path in this.schema.schema) {
      promises.push(this.iterateFields(path, this.schema.schema[path], input, doc, this.setField.bind(this)))
    }
    return Promise.all(promises)
      .then(result => doc);
  }

  afterLoad(doc) {
    return new Promise((resolve, reject) => {
      resolve(doc);
    });
  }

  /** Public Functions */

  find(query, options) {
    return this.initialized.then(() => {
      return this.db.find(this.collectionName, query, options)
        .then(docs => docs.map(doc => this.afterLoad(doc)));
    });
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

  read(query, options) {
    return this.initialized.then(() => {
      return this.db.read(this.collectionName, query, options)
        .then(doc => this.afterLoad(doc));
    });
  }

  update(doc) {
    return this.initialized.then(() => {
      this.beforeSave(doc)
        .then(doc => {
          return this.db.update(this.collectionName, doc)
            .then(doc => this.afterLoad(doc));
        });
    });
  }

  delete(_id) {
    return this.initialized.then(() => {
      return this.db.delete(this.collectionName, _id);
    });
  }
};
