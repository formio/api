// We can't use import for package.json or it will mess up the lib folder.
/* tslint:disable */
const {version} = require('../package.json');
/* tslint:enable */
import * as bcrypt from 'bcryptjs';
import * as uuid from 'uuid/v4';
import {Export as ExportClass} from './classes/Export';
import {Import as ImportClass} from './classes/Import';
import {Model} from './dbs/Model';
import {porters} from './entities/porters';
import {resources} from './entities/resources';
import {schemas} from './entities/schemas';
import {actions} from './entities/Submission/actions';
import {log} from './log';
import {routes as routeClasses} from './routes';
import {util} from './util';

const EVERYONE = '000000000000000000000000';

export class Api {

  get isServer() {
    return true;
  }

  get db() {
    return this._db;
  }

  set db(db) {
    this._db = db;
    Object.values(this.models).forEach((model: Model) => {
      model.db = db;
    });
  }

  get reservedForms() {
    return this.config.reservedForms;
  }

  get beforePhases() {
    return [
      this.init.bind(this),
      this.context.bind(this),
      this.authenticate.bind(this),
      this.authorize.bind(this),
      this.beforeExecute.bind(this),
    ];
  }

  get afterPhases() {
    return [
      this.afterExecute.bind(this),
      this.respond.bind(this),
    ];
  }

  get schemas(): any {
    return schemas;
  }

  get porters(): any {
    // These are in import order.
    return [
      porters.Role,
      porters.Resource,
      porters.Form,
      porters.Action,
      porters.Submission,
      // porters.ActionItem,
    ];
  }

  get resourceClasses(): any {
    return resources;
  }

  get resourceTypes(): any {
    // These are in order of primary entity type for permissions.
    // micro -> macro level
    return [
      'submission',
      'form',
      'role',
      'action',
    ];
  }

  /**
   * List of permissions associated with a request method.
   */
  get methodPermissions(): any {
    return {
      INDEX: { all: 'read_all', own: 'read_own' },
      POST: { all: 'create_all', own: 'create_own' },
      GET: { all: 'read_all', own: 'read_own' },
      PUT: { all: 'update_all', own: 'update_own' },
      PATCH: { all: 'update_all', own: 'update_own' },
      DELETE: { all: 'delete_all', own: 'delete_own' },
    };
  }

  get actions() {
    return actions;
  }

  get routeClasses() {
    return routeClasses;
  }

  get util() {
    return util;
  }

  get ImportClass() {
    return ImportClass;
  }

  get ExportClass() {
    return ExportClass;
  }
  public log;
  public config;
  public router;
  public models;
  public resources;
  public routes;
  public swagger;
  private _db;
  private locks;

  constructor(router, db, config) {
    this.log = log;
    this.config = config;
    this.router = router;
    this._db = db;
    this.models = {};
    this.resources = {};
    this.routes = {};
    this.locks = {};
    this.swagger = {
      components: {},
      tags: [],
    };

    log('info', 'Starting Form Manager');
    this.addModels();
    this.router.use(this.beforePhases);
    this.addResources();
    this.addRoutes();
    this.router.use(this.afterPhases);
  }

  /**
   * Allow overriding available roles in a request.
   *
   * @param req
   * @returns {*}
   */
  public getRoles(req = null) {
    return req.context.roles.all;
  }

  /**
   * Determine the primary entity for a request. This should go from least to greatest. For example, if a submission id
   * exists, it should be a submission, not a form.
   *
   * @param req
   * @returns {*}
   */
  public primaryEntity(req) {
    let entity = null;
    this.resourceTypes.forEach((type) => {
      if (req.context.resources.hasOwnProperty(type) && req.context.resources[type] && !entity) {
        entity = {
          type,
          owner: req.context.resources[type].owner,
          id: req.context.resources[type]._id,
        };
      }
    });
    return entity;
  }

  /**
   * Get a set of roles for the primary entity that has permission to perform the method.
   *
   * @param user
   * @param info
   * @param method
   */
  public entityPermissionRoles(req, info, method, type) {
    const entity = req.context.resources[info.type];
    let permissionEntity = entity;
    let accessKey = 'access';

    // Submissions check their permissions against the form so use it instead.
    if (
      (info.type === 'submission') ||
      (info.type === 'form' && method === 'POST') ||
      (info.type === 'form' && method === 'INDEX')
    ) {
      permissionEntity = req.context.resources.form;
      accessKey = 'submissionAccess';
    }

    let roles = [];

    if (!permissionEntity || !permissionEntity[accessKey] || !Array.isArray(permissionEntity[accessKey])) {
      return roles;
    }

    // Exception for "self" access.
    if (type === 'self') {
      return permissionEntity[accessKey].reduce((hasSelf, access) => hasSelf || access.type === 'self', false);
    }

    permissionEntity[accessKey].forEach((access) => {
      if (access.type === type) {
        roles = [...roles, ...access.roles];
      }
    });

    return roles.filter((role) => role).map((role) => role.toString());
  }

  /**
   * Get a list of the user's roles.
   *
   * @param req
   * @param user
   * @returns {*[]}
   */
  public userRoles(req) {
    if (!req.user) {
      return [
        ...req.context.roles.default.map((role) => role._id),
        EVERYONE,
      ];
    }

    return [
      ...req.user.roles,
      EVERYONE,
    ];
  }

  public loadEntities(req, model, query) {
    return this.models[model].find(query, {}, req.context ? req.context.params : {});
  }

  public loadEntity(req, model, query) {
    return this.loadEntities(req, model, query).then((docs) => Array.isArray(docs) ? docs[0] : docs);
  }

  public query(query) {
    return query;
  }

  /**
   * Convert aliases to ids for the path.
   *
   * @param req
   * @param baseUrl
   * @param next
   * @returns {*}
   */
  public alias(req, baseUrl = '', next) {
    // Pre initialize conted
    req.context = req.context || {};
    req.context.params = req.context.params || {};

    /* eslint-disable no-useless-escape */
    const formsRegEx = new RegExp(`\/(${this.reservedForms.join('|')})($|\/.*)`, 'i');
    /* eslint-enable no-useless-escape */

    // Get the alias from the request.
    const alias = req.url.split('?')[0].substr(baseUrl.length).replace(formsRegEx, '').substr(1);

    // If this is normal request, pass this middleware.
    /* eslint-disable no-useless-escape */
    if (!alias || alias.match(/^(form$|form[\?\/])/) || alias === 'spec.json') {
      return next();
    }

    this.loadEntities(req, 'Form', {
      path: alias,
    })
      .then((forms) => {
        // If no form was found, continue.
        if (!forms.length) {
          return next();
        }

        const form = forms[0];
        // Get the additional path.
        let additional = req.url.substr(baseUrl.length + alias.length + 1);

        // Handle a special case where they 'POST' to the form. Assume to create a submission.
        if (!additional && req.method === 'POST') {
          additional = '/submission';
        }

        // Create the new URL for the form.
        req.url = `${baseUrl}/form/${form._id}${additional}`;
        next();
      })
      .catch(next);
  }

  public url(path, req) {
    Object.keys(req.context.params).forEach((param) => {
      path = path.replace(`:${param}`, req.context.params[param]);
    });
    return path;
  }

  public async addModels() {
    log('info', 'Adding models');
    const schemas = this.schemas;
    for (const schema of Object.keys(schemas)) {
      log('debug', `Adding model ${schema}`);
      this.models[schema] = new this.db.Model(new schemas[schema](this), this.db);
    }
    await Promise.all(Object.values(this.models).map((model: any) => model.initialized));
    return this.db.connect();
  }

  public addResources() {
    log('info', 'Adding resources');
    for (const resourceName of Object.keys(this.resourceClasses)) {
      log('debug', `Adding resource ${  resourceName}`);
      this.resources[resourceName] = new this.resourceClasses[resourceName](
        this.models[resourceName],
        this.router,
        this,
      );
    }
  }

  public addRoutes(base = '') {
    Object.values(this.routeClasses).forEach((Route: any) => {
      const route = new Route(this, base);
      this.log('debug', `Registering route ${route.method.toUpperCase()}: ${route.path}`);
      this.routes[`${route.method}-${route.path}`] = route;
      route.register(this.router);
    });
  }

  public init(req, res, next) {
    req.uuid = req.uuid || uuid();
    log('info', req.uuid, req.method, req.path, 'init');

    this.alias(req, '', next);
  }

  public async context(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'context');

    req.context = req.context || {};
    req.context.resources = req.context.resources || {};
    req.context.params = req.context.params || {};
    req.context.roles = req.context.roles || {};
    const loads = [];
    const route = [''];

    req.permissions = {
      all: false,
      own: false,
      self: false,
      admin: false,
    };

    // Load any resources listed in path.
    const parts = req.path.split('/');
    // Throw away the first empty item.
    parts.shift();

    try {
      parts.forEach((part, index) => {
        if (this.resourceTypes.includes(part) && (index + 2) <= parts.length) {
          route.push(part);
          route.push(`:${part}Id`);
          req.context.params[`${part}Id`] = parts[index + 1];
          const modelName = part.charAt(0).toUpperCase() + part.slice(1);
          loads.push(this.loadEntity(req, modelName, {
            _id: this.db.toID(parts[index + 1]),
          })
            .then((doc) => {
              if (!doc) {
                throw new Error(`Could not find ${part} ${parts[index + 1]}`);
              }
              req.context.resources[part] = doc;
            }));
        }
        else {
          if (index === 0 || !this.resourceTypes.includes(parts[index - 1])) {
            route.push(part);
          }
        }
      });
      req.context.route = route.join('/');

      // Load all, admin, and default roles.
      loads.push(this.loadEntities(req, 'Role', {})
        .then((roles) => req.context.roles.all = roles));
      loads.push(this.loadEntities(req, 'Role', { admin: true })
        .then((roles) => req.context.roles.admin = roles));
      loads.push(this.loadEntities(req, 'Role', { default: true })
        .then((roles) => req.context.roles.default = roles));

      // Load actions associated with a form if we have a submission.
      if (req.context.params.hasOwnProperty('formId')) {
        loads.push(this.loadEntities(req, 'Action', {
            entity: this.db.toID(req.context.params.formId),
            entityType: 'form',
          })
            .then((actions) => {
              req.context.actions = actions.sort((a, b) => b.priority - a.priority);
            }),
        );
      }
    }

    catch (err) {
      return res.status(400).send(err);
    }

    Promise.all(loads)
      .then(() => {
        next();
      })
      .catch((err) => {
        res.status(400).send(err);
      });
  }

  public authenticate(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'authenticate');
    // Authentication is implemented at the next level up.
    next();
  }

  public authorize(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'authorize');

    if (req.permissionsChecked) {
      log('info', req.uuid, 'Permissions already checked');
      return next();
    }

    if (this.config.adminKey) {
      // If admin key is set in config and matches what is sent in the header,
      req.permissions.admin = true;
      if (req.headers['x-admin-key'] && this.config.adminKey === req.headers['x-admin-key']) {
        return next();
      }

      // If using admin key as a bearer token
      if (req.headers.authorization && req.headers.authorization === `Bearer: ${this.config.adminKey}`) {
        return next();
      }
    }

    // Check if this is a defined route. If so, call the authorize method on the route class.
    const route = this.getRoute(req.path, req.context.params);
    const routeInstance = this.routes[`${req.method.toLowerCase()}-${route}`] || this.routes[`use-${route}`];
    if (routeInstance) {
      const result = routeInstance.authorize(req);
      if (result === true) {
        return next();
      }
      if (result === false) {
        return res.status(401).send('Unauthorized');
      }
    }

    const entity = this.primaryEntity(req);
    // If there is no entity we are at the root level. Give permission.
    if (!entity) {
      return next();
    }
    let method = req.method.toUpperCase();

    // TODO: Get a better way of determining index requests.
    // Index requests will do the filtering on the query so allow use of own permissions even if they aren't the
    // owner of the current entity.
    const lastPart = req.path.split('/').slice(-1)[0];
    if (
      method === 'GET' && this.resourceTypes.includes(lastPart) ||
      method === 'GET' && lastPart === 'export'
    ) {
      method = 'INDEX';
    }

    const allRoles = this.entityPermissionRoles(req, entity, method, this.methodPermissions[method].all);
    const ownRoles = this.entityPermissionRoles(req, entity, method, this.methodPermissions[method].own);
    const userRoles = this.userRoles(req);

    // Determine if there is an intersection of the user roles and roles that have permission to access the entity
    // regardless of owner.
    if (
      (userRoles.filter((role) => -1 !== allRoles.indexOf(role))).length !== 0
    ) {
      req.permissions.all = true;
      return next();
    }

    req.permissions.self = this.entityPermissionRoles(req, entity, method, 'self');

    // Determine if there is an intersection of the user roles and roles that have permission to access only own items.
    if (
      (
        (req.user && entity.owner === req.user._id) ||
        (req.user && req.permissions.self && entity.id === req.user._id) ||
        method === 'POST' ||
        (req.user && method === 'INDEX')
      ) &&
      (userRoles.filter((role) => -1 !== ownRoles.indexOf(role))).length !== 0
    ) {
      req.permissions.owner = true;
      return next();
    }

    // If they don't have access by now, they don't have access.
    return res.status(401).send('Unauthorized');
  }

  public importTemplate(template, req) {
    const importer = new this.ImportClass(this, template, req);

    return importer.import();
  }

  public exportTemplate(req) {
    const exporter = new this.ExportClass(this, req);

    return exporter.export();
  }

  public getStatus(status: any = {}) {
    status.api = version;
    return status;
  }

  public beforeExecute(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'beforeExecute');

    next();
  }

  public afterExecute(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'afterExecute');
    next();
  }

  public respond(req, res) {
    log('info', req.uuid, req.method, req.path, 'response');
    const headers = [];

    if (res.token) {
      if (req.headers.hasOwnProperty('x-jwt-token') || !req.headers.hasOwnProperty('Authorization')) {
        headers.push('x-jwt-token');
        res.setHeader('x-jwt-token', res.token);
      }
      headers.push('Authorization');
      res.setHeader('Authorization', `Bearer: ${res.token}`);
    }

    if (!res.resource) {
      res.setHeader('Access-Control-Expose-Headers', headers.join(', '));
      return res.status(404).send();
    }
    if (res.resource.items) {
      headers.push('Content-Range');
      res.setHeader('Content-Range', this.getRangeHeader(res.resource.count, req));
      res.setHeader('Access-Control-Expose-Headers', headers.join(', '));
      return res.send(res.resource.items);
    }
    if (res.resource.item) {
      res.setHeader('Access-Control-Expose-Headers', headers.join(', '));
      return res.status(res.resource.status || 200).send(res.resource.item);
    }
    res.setHeader('Access-Control-Expose-Headers', headers.join(', '));
    res.status(404).send('Not found');
  }

  public getRoute(path, params) {
    for (const key of Object.keys(params)) {
      path = path.replace(params[key], `:${key}`);
    }
    return path;
  }

  public getRangeHeader(count, req) {
    const skip = req.query.skip || 0;
    const limit = req.query.limit || 10;
    const start = skip;
    let end = skip + limit - 1;
    // End can't be greater than count - 1.
    if (end >= count) {
      end = count - 1;
    }

    // End can't be less than zero
    if (end < 0) {
      end = 0;
    }

    return `${start}-${end}/${count}`;
  }

  /**
   * If you need to mimic a request to a new server you can use this function.
   *
   * @param req
   * @param res
   * @param url
   * @param body
   */
  public makeChildRequest({
      req,
      url,
      middleware,
      body,
      method = 'get',
      params = {},
      query = {},
      options = {},
  }: {
    req: Request,
    url: string,
    middleware: () => undefined,
    body?: any,
    method?: string,
    params?: any,
    query?: any,
    options?: any,
  }) {
    const childReq = this.createChildReq(req);

    if (!childReq) {
      return Promise.reject('Too many recursive requests');
    }

    childReq.body = body;
    childReq.params = params;
    childReq.query = query;
    childReq.method = method.toUpperCase();
    childReq.url = url;
    childReq.path = Object.keys(params).reduce((prev, key) => prev.replace(`:${key}`, params[key]), url);
    if (options.permissionsChecked) {
      childReq.permissionsChecked = true;
    }

    return new Promise((resolve, reject) => {
      const childRes = this.createChildRes((result) => {
        if (childRes.statusCode > 299) {
          return reject(result);
        }
        return resolve(result);
      });

      return this.executeMiddleware(childReq, childRes, [
        ...this.beforePhases,
        middleware,
        ...this.afterPhases,
      ]);
    });
  }

  public createChildReq(req) {
    // Determine how many child requests have been made.
    let childRequests = req.childRequests || 0;

    // Break recursive child requests.
    if (childRequests > 5) {
      return null;
    }

    const childReq = { ...req };

    childReq.childRequests = ++childRequests;

    delete childReq.context;

    return childReq;
  }

  public createChildRes(respond) {
    respond = respond || (() => undefined);
    const subResponse = {
      statusCode: 200,
      send: (result) => respond(result),
      json: (result) => respond(result),
      setHeader: () => undefined,
      getHeader: () => undefined,
      sendStatus: (status, result) => {
        subResponse.statusCode = status;
        respond(result);
      },
      status: (status) => {
        subResponse.statusCode = status;
        return subResponse;
      },
    };
    return subResponse;
  }

  // This mimics expressjs middleware.
  public executeMiddleware(req, res, middleware) {
    return middleware.reduce((prev, func) => {
      return prev.then(
        () => new Promise((resolve, reject) => {
          func(req, res, (err) => err ? reject(err) : resolve());
        }),
      );
    }, Promise.resolve());
  }

  public async executeAction(actionItem, req, res) {
    log('info', 'Execute action', req.uuid, actionItem.action);

    try {
      const release = await this.lock(actionItem._id);

      let action: any;

      if (!action) {
        action = await this.loadEntity(req, 'Action', {
          _id: this.db.toID(actionItem.action),
        });
      }

      // Syncronously add messages to actionItem.
      let previous = Promise.resolve();
      const setActionItemMessage = (message, data = {}, state = null) => {
        previous.then(() => {
          actionItem.messages.push({
            datetime: new Date(),
            info: message,
            data,
          });

          if (state) {
            actionItem.state = state;
          }

          previous = this.models.ActionItem.update(actionItem);
        });
      };

      if (this.actions.hasOwnProperty(action.name)) {
        const Action = this.actions[action.name];

        if (this.isServer || !Action.serverOnly) {
          setActionItemMessage('Starting Action', {});
          const instance = new Action(this, action.settings);
          return instance.resolve({
            handler: actionItem.handler,
            method: actionItem.method,
            data: actionItem.data,
            context: actionItem.context,
            req,
            res,
          }, setActionItemMessage)
            .then(() => {
              setActionItemMessage('Action Resolved (no longer blocking)', {}, 'complete');
            })
            .catch((error) => {
              setActionItemMessage('Error Occurred', error);
              throw error;
            });
        }
      }

      release();
    } catch (err) {
      // swallow the error.
      log('error', err);
    }
  }

  /**
   * This is a basic locking system. For servers it should be overridden to provide for concurrency between server
   * instances.
   *
   * @param key
   * @returns {Promise<Function>}
   */
  public lock(key) {
    // If lock is already set on it.
    if (this.locks[key]) {
      return Promise.reject();
    }

    this.locks[key] = true;

    let timeout = null;

    const removeLock = () => {
      delete this.locks[key];
      clearTimeout(timeout);
    };

    // Remove the lock automatically after 30 seconds.
    timeout = setTimeout(removeLock, 30000);

    return Promise.resolve(removeLock);
  }

  public encrypt(text) {
    return new Promise((resolve, reject) => {
      // Check if it is already encrypted.
      if (text.match(/\$2a\$\d\d\$[.\/0-9A-Za-z]{53}/g)) {
        return resolve(text);
      }
      bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          return reject(err);
        }

        bcrypt.hash(text, salt, (error, hash) => {
          if (error) {
            return reject(error);
          }

          resolve(hash);
        });
      });
    });
  }

  public generateToken(payload) {
    return;
  }

  public tokenPayload(user, form) {
    return;
  }
}
