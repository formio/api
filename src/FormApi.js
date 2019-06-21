const uuid = require('uuid/v1');
const info = require('../package.json');
const log = require('./log');
const util = require('./util');
const ImportClass = require('./libraries/Import');
const actions = require('./actions');
const config = require('../config');
const resources = require('./resources');
const EVERYONE = '000000000000000000000000';

module.exports = class FormApi {
  constructor(router, db) {
    this.config = config;
    this.router = router;
    this.db = db;
    this.models = {};
    this.resources = {};

    log('info', 'Starting Form Manager');
    this.addModels();
    this.router.use(this.beforePhases);
    this.addResources();
    this.router.get('/access', this.access.bind(this));
    this.router.get('/current', this.current.bind(this));
    this.router.get('/import', this.import.bind(this));
    this.router.get('/status', this.status.bind(this));
    this.router.use(this.afterPhases);
  }

  get reservedForms() {
    return [
      'submission',
      'exists',
      'export',
      'role',
      'current',
      'logout',
      'form',
      'access',
      'token',
      'recaptcha',
    ]
  }

  get beforePhases() {
    return [
      this.init.bind(this),
      this.context.bind(this),
      this.authenticate.bind(this),
      this.authorize.bind(this),
      this.beforeExecute.bind(this),
    ];
  };

  get afterPhases() {
    return [
      this.afterExecute.bind(this),
      this.respond.bind(this),
    ]
  }

  get schemas() {
    return require('./schemas');
  };

  get resourceClasses() {
    return resources;
  }

  get resourceTypes() {
    // These are in order of primary entity type for permissions.
    // micro -> macro level
    return [
      'submission',
      'form',
      'role',
      'action',
    ]
  }

  /**
   * List of permissions associated with a request method.
   *
   * @returns {{POST: {all: string, own: string}, GET: {all: string, own: string}, PUT: {all: string, own: string}, PATCH: {all: string, own: string}, DELETE: {all: string, own: string}}}
   */
  get methodPermissions() {
    return {
      'POST': {all: 'create_all', own: 'create_own'},
      'GET': {all: 'read_all', own: 'read_own'},
      'PUT': {all: 'update_all', own: 'update_own'},
      'PATCH': {all: 'update_all', own: 'update_own'},
      'DELETE': {all: 'delete_all', own: 'delete_own'}
    }
  }

  get actions() {
    return actions;
  }

  /**
   * Determine the primary entity for a request. This should go from least to greatest. For example, if a submission id
   * exists, it should be a submission, not a form.
   *
   * @param req
   * @returns {*}
   */
  primaryEntity(req) {
    let entity = null;
    this.resourceTypes.forEach(type => {
      if (req.context.hasOwnProperty(type) && !entity) {
        entity = {
          type,
          id: req.context.resources[type]._id,
        }
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
  entityPermissionRoles(req, info, method) {
    const entity = req.context.resources[info.type];
    const accessKey = info.type === 'submission' ? 'submissionAccess' : 'access';
    let roles = [];

    entity[accessKey].forEach(access => {
      // Handle "all" permission
      if (access.type === this.methodPermissions[method].all) {
        roles = [...roles, ...access.roles];
      }
      // Handle "own" permission
      if (access.type === this.methodPermissions[method].own) {
        if (req.user && entity.owner === req.user._id) {
          roles = [...roles, ...access.roles];
        }
      }
      // Handle "self" permission
      if (access.type === 'self') {
        if (req.user._id === entity._id) {
          // Find *_own permission again.
          const ownAccess = entity[accessKey].filter(access => access.type === this.methodPermissions[method].own);
          if (ownAccess.length) {
            roles = [...roles, ...ownAccess[0].roles];
          }
        }
      }
    });

    return roles.map(role => role.toString());
  }

  /**
   * Get a list of the user's roles.
   *
   * @param req
   * @param user
   * @returns {*[]}
   */
  userRoles(req) {
    if (!req.user) {
      return [
        ...req.context.roles.default.map(role => role._id),
        EVERYONE,
      ];
    }

    return [
      ...req.user.roles,
      EVERYONE,
    ];
  }

  /**
   * Load a role into context
   *
   * @param req
   * @param roleName
   * @param query
   * @returns {*|PromiseLike<T>|Promise<T>}
   */
  loadRoles(req, type, query) {
    return this.models.Role.find(query)
      .then(roles => {
        req.context.roles[type] = roles;
      });
  }

  loadActions(req, query) {
    return this.models.Action.find(query)
      .then(actions => {
        req.context.actions = actions.sort((a, b) => b.priory - a.priority);
      });
  }

  /**
   * Convert aliases to ids for the path.
   *
   * @param req
   * @param baseUrl
   * @param next
   * @returns {*}
   */
  alias(req, baseUrl = '', next) {
    const formsRegEx = new RegExp(`\/(${this.reservedForms.join('|')})($|\/.*)`, 'i');

    // Get the alias from the request.
    const alias = req.url.split('?')[0].substr(baseUrl.length).replace(formsRegEx, '').substr(1);

    // If this is normal request, pass this middleware.
    /* eslint-disable no-useless-escape */
    if (!alias || alias.match(/^(form$|form[\?\/])/) || alias === 'spec.json') {
      return next();
    }

    this.models.Form.find({
      path: alias
    })
      .then(forms => {
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

  getModelClass(schema) {
    return require('./libraries/PreserveModel');
  }

  addModels() {
    log('info', 'Adding models');
    const schemas = this.schemas;
    for (const schema in schemas) {
      log('debug', 'Adding model ' + schema);
      this.models[schema] = new (this.getModelClass(schemas[schema]))(schemas[schema], this.db);
    }
  }

  addResources() {
    log('info', 'Adding resources');
    for (const resourceName in this.resourceClasses) {
      log('debug', 'Adding resource ' + resourceName);
      this.resources[resourceName] = new this.resourceClasses[resourceName](this.models[resourceName], this.router, this);
    }
  }

  init(req, res, next) {
    req.uuid = uuid();
    log('info', req.uuid, req.method, req.path, 'init');

    this.alias(req, '', next);
  }

  context(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'context');

    req.context = req.context || {};
    req.context.resources = req.context.resources || {};
    req.context.params = req.context.params || {};
    req.context.roles = req.context.roles || {};
    const loads = [];

    // Load any resources listed in path.
    const parts = req.path.split('/');
    // Throw away the first empty item.
    parts.shift();

    parts.forEach((part, index) => {
      if (this.resourceTypes.includes(part) && (index + 2) <= parts.length) {
        req.context.params[part] = parts[index + 1];
        loads.push(this.db.read(part + 's', {
          _id: new this.db.ID(parts[index + 1])
        })
          .then(doc => {
            req.context.resources[part] = doc;
          }));
      }
    });

    // Load all, admin, and default roles.
    loads.push(this.loadRoles(req, 'all', {}));
    loads.push(this.loadRoles(req, 'admin', {admin: true}));
    loads.push(this.loadRoles(req, 'default', {default: true}));

    // Load actions associated with a form if we have a submission.
    if (req.context.params.hasOwnProperty('form')) {
      loads.push(this.loadActions(req, {
        form: new this.db.ID(req.context.params['form']),
      }))
    }

    Promise.all(loads)
      .then(() => {
        next();
      })
      .catch(err => {
        next(err);
      });
  }

  authenticate(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'authenticate');
    // Authentication is implemented at the next level up.
    next();
  }

  authorize(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'authorize');

    if (this.config.adminKey) {
      // If admin key is set in config and matches what is sent in the header,
      if (req.headers['x-admin-key'] && this.config.adminKey === req.headers['x-admin-key']) {
        return next();
      }

      // If using admin key as a bearer token
      if (req.headers['authorization'] && req.headers['authorization'] === `Bearer: ${this.config.adminKey}`) {
        return next();
      }
    }

    const entity = this.primaryEntity(req);
    // If there is no entity we are at the root level. Give permission.
    if (!entity) {
      return next();
    }
    const method = req.method.toUpperCase();
    const entityPermissionRoles = this.entityPermissionRoles(req, entity, method);
    const userRoles = this.userRoles(req);

    // Determine if there is an intersection of the user roles and roles that have permission to access the entity.
    if (
      (userRoles.filter(role => -1 !== entityPermissionRoles.indexOf(role))).length !== 0
    ) {
      return next();
    }

    // If we don't have access by now, they don't have access.
    return res.status(401).send();
  }

  access(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'access');

    Promise.all([
      this.models.Role.find({}),
      this.models.Form.find({}),
    ])
      .then(results => {
        res.send({
          roles: results[0].reduce((result, role) => {
            result[role.title.replace(/\s/g, '').toLowerCase()] = {
              _id: role._id,
              title: role.title,
              admin: role.admin,
              default: role.default,
            }
            return result;
          }, {}),
          forms: results[1].reduce((result, form) => {
            result[form.name] = {
              _id: form._id,
              title: form.title,
              name: form.name,
              path: form.path,
              access: form.access,
              submissionAccess: form.submissionAccess,
            }
            return result;
          }, {}),
        });
      });
  }

  import(req, res, next) {
    let template = req.body.template;
    if (typeof template === 'string') {
      template = JSON.parse(template);
    }

    this.importClass(template)
      .then(() => {
        res.status(200).send('Ok');
      })
      .catch(next)
  }

  get ImportClass() {
    return ImportClass
  };

  importTemplate(template) {
    const importer = new this.ImportClass(this, template);

    return importer.import();
  }

  current(req, res) {
    log('info', req.uuid, req.method, req.path, 'current');
    // TODO: convert this to subrequest? Need to protect password field.
    res.send(req.user);
  }

  getStatus (status = {}) {
    status.formApiVersion = info.version;
    return status;
  }

  status(req, res) {
    res.send(this.getStatus());
  }

  beforeExecute(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'beforeExecute');
    next();
  }

  afterExecute(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'afterExecute');
    next();
  }

  respond(req, res, next) {
    log('info', req.uuid, req.method, req.path, 'response');

    if (res.token) {
      res.setHeader('Access-Control-Expose-Headers', 'x-jwt-token, Authorization');
      res.setHeader('x-jwt-token', res.token);
      res.setHeader('Authorization', `Bearer: ${res.token}`);
    }

    if (!res.resource) {
      return res.status(404).send();
    }
    if (res.resource.items) {
      return res.send(res.resource.items);
    }
    if (res.resource.item) {
      return res.send(res.resource.item);
    }
    res.status(404).send('Not found');
  }

  get util() {
    return util;
  }
};
