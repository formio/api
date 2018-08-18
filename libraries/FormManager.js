const uuid = require('uuid/v1');
const log = require('./log');
const config = require('../config');
const EVERYONE = '000000000000000000000000';

module.exports = class FormManager {
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
    return require('../schemas');
  };

  get resourceClasses() {
    return require('../resources');
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
          id: req.context[type]._id,
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
    const entity = req.context[info.type];
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
        // TODO: Anonymous?,
        EVERYONE,
      ];
    }

    return [
      ...req.user.roles,
      EVERYONE,
    ];
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

        // Create the new URL for the project.
        req.url = `${baseUrl}/form/${form._id}${additional}`;
        next();
      })
      .catch(next);
  }

  getModelClass(schema) {
    return require('./PreserveModel');
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
      this.resources[resourceName] = new this.resourceClasses[resourceName](this.models[resourceName], this.router);
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
    const resources = [];

    const parts = req.path.split('/');
    // Throw away the first empty item.
    parts.shift();

    const loads = [];
    parts.forEach((part, index) => {
      if (this.resourceTypes.includes(part) && (index + 2) <= parts.length) {
        loads.push(this.db.read(part + 's', {
          _id: new this.db.ID(parts[index + 1])
        })
          .then(doc => {
            req.context[part] = doc;
          }));
      }
    });

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
      if (req.headers['admin_key'] && this.config.adminKey === req.headers['admin_key']) {
        return next();
      }

      // If using admin key as a bearer token
      if (req.headers['authorization'] && req.headers['authorization'] === `Bearer: ${this.config.adminKey}`) {
        return next();
      }
    }

    const entity = this.primaryEntity(req);
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
};
