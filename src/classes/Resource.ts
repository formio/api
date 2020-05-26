import {Router} from 'express';
import * as jsonpatch from 'fast-json-patch';
import * as moment from 'moment';
import {Model} from '../dbs/Model';
import {Api} from '../FormApi';
import {ResourceSwagger} from './ResourceSwagger';
import {Swagger} from './Swagger';

export class Resource {

  get name() {
    return this.model.name.toLowerCase();
  }

  get route() {
    return this.path(`/${this.name}`);
  }
  protected model: Model;
  protected router: Router;
  protected app: Api;

  constructor(model: Model, router: Router, app: Api) {
    this.model = model;
    this.router = router;
    this.app = app;

    this.rest();
  }

  public async index(req, res, next) {
    try {
      this.app.log('debug', `resource index called for ${this.name}`);
      const query = this.indexQuery(req);
      const options = this.model.indexOptions(req.query);
      const count = await this.model.count(query, {}, req.context.params);
      const docs = await this.model.find(query, options, req.context.params);
      res.resource = {
        count,
        items: await Promise.all(docs.map(async (doc) => await this.finalize(doc, req))),
      };
      this.app.log('debug', `resource index done for ${this.name}`);
      next();
    }
    catch (err) {
      next(err);
    }
  }

  public async post(req, res, next) {
    try {
      this.app.log('debug', `resource post called for ${this.name}`);
      const doc = await this.model.create(this.prepare(req.body, req), req.context.params);
      res.resource = {
        item: await this.finalize(doc, req),
        status: 201,
      };
      this.app.log('debug', `resource post done for ${this.name}`);
      next();
    }
    catch (err) {
      res.status(400).send(err);
    }
  }

  public async get(req, res, next) {
    try {
      this.app.log('debug', `resource get called for ${this.name}`);
      const query = this.getQuery(req, {});
      const doc = await this.model.read(query, req.context.params);
      res.resource = {
        item: await this.finalize(doc, req),
      };
      this.app.log('debug', `resource get done for ${this.name}`);
      next();
    }
    catch (err) {
      res.status(400).send(err);
    }
  }

  public async put(req, res, next) {
    try {
      this.app.log('debug', `resource put called for ${this.name}`);
      const doc = await this.model.update(this.prepare(req.body, req), req.context.params);
      res.resource = {
        item: await this.finalize(doc, req),
      };
      this.app.log('debug', `resource put done for ${this.name}`);
      next();
    }
    catch (err) {
      res.status(400).send(err);
    }
  }

  public async patch(req, res, next) {
    try {
      this.app.log('debug', `resource patch called for ${this.name}`);
      let patched = req.body;
      if (!req.patchApplied) {
        const prev = await this.model.read({
          _id: this.model.toID(req.context.params[`${this.name}Id`]),
        }, req.context.params);
        patched = jsonpatch.applyPatch(prev, req.body).newDocument;
      }
      const doc = await this.model.update(this.prepare(patched, req), req.context.params);
      res.resource = {
        item: await this.finalize(doc, req),
      };
      this.app.log('debug', `resource patch done for ${this.name}`);
      next();
    }
    catch (err) {
      res.status(400).send(err);
    }
  }

  public async delete(req, res, next) {
    try {
      this.app.log('debug', `resource delete called for ${this.name}`);
      const doc = await this.model.delete({
        _id: this.model.toID(req.context.params[`${this.name}Id`]),
      }, req.context.params);
      res.resource = {
        item: await this.finalize(doc, req),
      };
      this.app.log('debug', `resource delete done for ${this.name}`);
      next();
    }
    catch (err) {
      res.status(400).send(err);
    }
  }

  // Return additions to the swagger specification.
  public swagger() {
    const methods = ['index', 'post', 'get', 'put', 'patch', 'delete'];
    const swagger: Swagger = new ResourceSwagger(this.route, this.name, methods, this.model);

    return swagger.getJson();
  }

  protected path(route) {
    return route;
  }

  /**
   * Call an array of promises in series and call next() when done.
   *
   * @param promises
   * @param next
   */
  protected callPromisesAsync(promises) {
    return promises.reduce((p, f) => p
        .then(f)
        .catch((err) => Promise.reject(err))
      , Promise.resolve());
  }

  protected rest() {
    this.app.log('debug', `Registering rest endpoings for ${this.name}`);
    this.register('get', this.route, 'index');
    this.register('post', this.route, 'post');
    this.register('get', `${this.route}/:${this.name}Id`, 'get');
    this.register('put', `${this.route}/:${this.name}Id`, 'put');
    this.register('patch', `${this.route}/:${this.name}Id`, 'patch');
    this.register('delete', `${this.route}/:${this.name}Id`, 'delete');

    return this;
  }

  protected register(method, route, callback) {
    this.app.log('debug', `Registering route ${method.toUpperCase()}: ${route}`);
    this.router[method](route, (req, res, next) => {
      this[callback](req, res, next);
    });

    const swagger = this.swagger();

    if (!swagger) {
      return;
    }

    Swagger.extendInfo(this.app.swagger, swagger);
  }

  protected getQuery(req, query: any = {}) {
    query._id = this.model.toID(req.context.params[`${this.name}Id`]);
    return query;
  }

  protected indexQuery(req, query: any = {}) {
    // @ts-ignore
    const { limit, skip, select, sort, populate, ...filters } = req.query || {};

    // Iterate through each filter.
    for (const key of Object.keys(filters)) {
      let value = filters[key];
      const [name, selector] = key.split('__');
      let parts;

      // See if this parameter is defined in our model.
      const param = this.model.schema.schema[name.split('.')[0]];

      if (selector) {
        switch (selector) {
          case 'regex':
            // Set the regular expression for the filter.
            parts = value.match(/\/?([^/]+)\/?([^/]+)?/);

            try {
              value = new RegExp(parts[1]);
            } catch (err) {
              value = null;
            }
            query[name] = {
              $regex: value,
              $options: parts[2] || 'i',
            };
            break;
          case 'exists':
            value = ((value === 'true') || (value === '1')) ? true : value;
            value = ((value === 'false') || (value === '0')) ? false : value;
            value = !!value;
            query[name] = query[name] || {};
            query[name][`$${selector}`] = value;
            break;
          case 'in':
          case 'nin':
            value = Array.isArray(value) ? value : value.split(',');
            value = value.map((item) => {
              return this.indexQueryValue(name, item, param);
            });
            query[name] = query[name] || {};
            query[name][`$${selector}`] = value;
            break;
          default:
            value = this.indexQueryValue(name, value, param);
            query[name] = query[name] || {};
            query[name][`$${selector}`] = value;
            break;
        }
      } else {
        // Set the find query to this value.
        value = this.indexQueryValue(name, value, param);
        query[name] = value;
      }
    }

    // If all or admin, don't impose owner filters.
    if (req.permissions.all || req.permissions.admin) {
      return query;
    }

    // Anonymous is not allowed to use owner permissions
    if (!req.user) {
      query.owner = false;
      return query;
    }

    const userRoles = [
      this.app.db.toID(req.user._id),
      ...(req.user.roles || []).map((entity) => this.app.db.toID(entity)),
    ];

    const or: any = [
      {
        owner: this.app.db.toID(req.user._id),
      },
      {
        'access.type': { $in: ['read', 'write', 'admin'] },
        'access.resources': { $in: userRoles },
      },
    ];

    if (req.permissions.self) {
      or.push({
        _id: this.app.db.toID(req.user._id),
      });
    }

    query.$or = or;
    return query;
  }

  protected indexQueryValue(name, value, param) {
    if (!param) {
      return value;
    }
    if (param.type === 'number') {
      return parseInt(value, 10);
    }

    const date = moment.utc(value, ['YYYY-MM-DD', 'YYYY-MM', moment.ISO_8601], true);
    if (date.isValid()) {
      return date.toDate();
    }

    // If this is an ID, and the value is a string, convert to an ObjectId.
    if (param.type === 'id') {
      try {
        value = this.model.toID(value);
      } catch (err) {
        this.app.log('warning', `Invalid ObjectID: ${value}`);
      }
    }

    return value;
  }

  protected prepare(item, req) {
    // Ensure they can't change the id.
    if (req.context.params[`${this.name}Id`]) {
      item._id = req.context.params[`${this.name}Id`];
    }
    else {
      delete item._id;
    }

    if (req.method.toUpperCase() === 'POST' && !item.owner && req.user) {
      item.owner = req.user._id;
    }

    return item;
  }

  protected async finalize(item, req: any = {}) {
    return item;
  }
}
