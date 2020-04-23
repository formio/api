import {Schema} from '../classes';
import {log} from '../log';
import {lodash as _} from '../util/lodash';
import {Database} from './Database';

export class Model {

  public get db() {
    return this._db;
  }

  public set db(db) {
    this._db = db;

    // Ensure the model is initialized before returning any calls.
    if (this._db) {
      this.initialized = this.initialize();
    } else {
      // this.initialized = Promise.reject('DB not initialized');
    }
  }

  public get name() {
    return this.schema.name;
  }

  public get collectionName() {
    return `${this.name}s`;
  }
  public schema: Schema;
  public initialized: Promise<any>;
  private _db: Database;

  constructor(schema: Schema, db: Database) {
    // @TODO
    // populate (deprecate?)
    // description (what does this do? - swagger)

    this.schema = schema;
    this.db = db;
  }

  /* Private Functions */

  public initialize() {
    log('debug', `${this.collectionName} Ensuring collection is created`);
    return this.db.ensureCollection(this.collectionName, this.schema)
      .catch((err) => log('error', err))
      .then(() => {
        const promises = [];
        for (const name of Object.keys(this.schema.schema)) {
          const field = this.schema.schema[name];
          if (field.index) {
            log('debug', `Ensuring index for ${this.collectionName}.${name}`);
            promises.push(this.db.createIndex(this.collectionName, name));
          }
        }
        if (this.schema.index) {
          this.schema.index.map((index) => {
            log('debug', `Ensure extra index for ${this.collectionName} ${index.name}`);
            promises.push(this.db.createIndex(this.collectionName, index.spec, index.options));
          });
        }
        return Promise.all(promises);
      });
  }

  public toID(value) {
    try {
      return this.db.toID(value);
    } catch (err) {
      return value;
    }
  }

  /** Public Functions */
  public indexOptions(query, options = {}) {
    const optionKeys = ['limit', 'skip', 'select', 'sort'];

    optionKeys.forEach((key) => {
      if (query.hasOwnProperty(key)) {
        switch (key) {
          case 'limit':
          case 'skip':
            options[key] = parseInt(query[key], 10);
            break;
          case 'sort':
          case 'select':
            // Select has changed to projection.
            options[(key === 'select' ? 'projection' : key)] = query[key].split(',')
              .map((item) => item.trim())
              .reduce((prev, item) => {
                let val = 1;
                if (item.charAt(0) === '-') {
                  item = item.substring(1);
                  val = -1;
                }
                prev[item] = val;
                return prev;
              }, {});
            break;
        }
      }
    });

    return options;
  }

  public find(query = {}, options = {}, context = {}): Promise<any> {
    return this.initialized.then(() => {
      return this.db.find(this.collectionName, query, options)
        .then((docs) => Promise.all(docs.map((doc) => this.afterLoad(doc))));
    });
  }

  public findOne(query = {}, options = {}, context = {}) {
    return this.find(query, context, options)
      .then((docs) => docs[0]);
  }

  public count(query = {}, options = {}, context = {}) {
    return this.initialized.then(() => {
      return this.db.count(this.collectionName, query, options);
    });
  }

  public create(input, context?) {
    return this.initialized.then(() => {
      return this.beforeSave(input, {})
        .then((doc) => {
          return this.db.create(this.collectionName, doc)
            .then((doc) => this.afterLoad(doc));
        });
    });
  }

  public read(query, context?) {
    return this.initialized.then(() => {
      return this.db.read(this.collectionName, query)
        .then((doc) => this.afterLoad(doc));
    });
  }

  public update(input, context?) {
    return this.initialized.then(() => {
      return this.read({ _id: this.toID(input._id) }, context).then((previous) => {
        const doc = previous || {};
        return this.beforeSave(input, doc)
          .then((doc) => {
            return this.db.update(this.collectionName, doc, context)
              .then((doc) => this.afterLoad(doc));
          });
      });
    });
  }

  public delete(query, context?, options?) {
    return this.initialized.then(() => {
      return this.db.delete(this.collectionName, query);
    });
  }

  protected async iterateFields(path, schema, input, result, execute) {
    if (Array.isArray(schema) || (Array.isArray(schema.type) && schema.type.length >= 1)) {
      const type = Array.isArray(schema) ? schema : schema.type;
      const values = _.get(input, path, []);

      // Pass array base to setField so it can be initialized.
      await execute(path, {type}, input, result);

      await values.map(async (value, index) => {
        if (typeof type[0] === 'object' && (!('type' in type[0]) || typeof type[0].type === 'object')) {
          for (const name of Object.keys(type[0])) {
            await this.iterateFields(`${path}[${index}].${name}`, type[0][name], input, result, execute);
          }
        }
        else if (typeof type[0] === 'object' && 'type' in type[0]) {
          await this.iterateFields(`${path}[${index}]`, type[0], input, result, execute);
        }
        else {
          const field = {
            ...schema,
            type: type[0],
          };
          await this.iterateFields(`${path}[${index}]`, field, input, result, execute);
        }
      });
    } else if (typeof schema.type === 'object') {
      for (const name of Object.keys(schema.type)) {
        await this.iterateFields(`${path}.${name}`, schema.type[name], input, result, execute);
      }
    } else {
      await execute(path, schema, input, result);
    }
    return result;
  }

  protected async beforeSave(input, doc) {
    input = await this.schema.preSave(input, this);

    // Ensure all fields are set first.
    for (const path of Object.keys(this.schema.schema)) {
      await this.iterateFields(path, this.schema.schema[path], input, doc, this.setField.bind(this));
    }

    // Run validations.
    const errors = {};
    for (const path of Object.keys(this.schema.schema)) {
      await this.iterateFields(path, this.schema.schema[path], doc, errors, this.validateField.bind(this));
    }

    if (Object.keys(errors).length) {
      throw {errors};
    }

    return doc;
  }

  protected setField(path, field, input, doc) {
    let value = _.get(input, path);
    return new Promise((resolve, reject) => {
      if (Array.isArray(field.type)) {
        _.set(doc, path, Array.isArray(value) && value.length ? [] : _.get(doc, path, []));
        return resolve();
      }

      // Set default value
      if ((value === null || value === undefined) && field.hasOwnProperty('default')) {
        if (typeof field.default === 'function') {
          value = field.default();
        } else {
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
              value = parseInt(value, 10);
              break;
            case 'boolean':
              value = !!value;
              break;
            case 'date':
              try {
                value = new Date(value);
              } catch (err) {
                if (!field.looseType) {
                  return reject(`'${path}' invalid type`);
                }
              }
              break;
            case 'id':
              try {
                value = this.toID(value);
              } catch (err) {
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
                } catch (err) {
                  if (!field.looseType) {
                    return reject(`'${path}' invalid type`);
                  }
                }
              }
          }
        }
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

      // Set the path on the doc
      if (value !== null && value !== undefined) {
        _.set(doc, path, value);
      }

      return resolve();
    });
  }

  protected async validateField(path, field, input, errors) {
    const value = _.get(input, path);

    // Required
    if (!value && value !== 0 && field.required) {
      errors[path] = {
        path,
        message: `'${path}' is required`,
      };
    }

    // Enumerated values.
    if (value && field.hasOwnProperty('enum')) {
      if (!field.enum.includes(value)) {
        errors[path] = {
          path,
          message: `Invalid enumerated option in '${path}'`,
        };
      }
    }

    // Validate the value
    if (field.hasOwnProperty('validate') && Array.isArray(field.validate)) {
      for (const item of field.validate) {
        if (item.isAsync) {
          await new Promise((resolve) => {
            item.validator.call(input, value, this, (result, message) => {
              if (!result) {
                errors[path] = {
                  path,
                  message: message || item.message,
                };
              }
              resolve();
            });
          });
        } else {
          if (!item.validator.call(input, value, this)) {
            errors[path] = {
              path,
              message: item.message,
            };
          }
        }
      }
    }
  }

  protected afterLoad(doc) {
    if (!doc) {
      return Promise.resolve(doc);
    }
    const promises = [];
    for (const path of Object.keys(this.schema.schema)) {
      promises.push(this.iterateFields(path, this.schema.schema[path], doc, doc, this.getField.bind(this)));
    }
    return Promise.all(promises)
      .then(() => doc);
  }

  protected getField(path, field, input, doc) {
    let value = _.get(input, path);

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
}
