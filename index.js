'use strict';

const uuid = require('uuid/v1');
const ObjectID = require('mongodb').ObjectID;

module.exports = class FormManager {
  constructor(router, db) {
    this.router = router;
    this.db = db;
    this.models = {};
    this.resources = {};

    console.log('Initializing database');
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
      this.access.bind(this),
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
    return require('./resources');
  }

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
    return require('./libraries/PreserveModel');
  }

  addModels() {
    const schemas = this.schemas;
    for (const schema in schemas) {
      this.models[schema] = new (this.getModelClass(schemas[schema]))(schemas[schema], this.db);
    }
  }

  addResources() {
    for (const resourceName in this.resourceClasses) {
      this.resources[resourceName] = new this.resourceClasses[resourceName](this.models[resourceName], this.router);
    }
  }
  init(req, res, next) {
    req.uuid = uuid();
    console.log(req.uuid, req.method, req.path, 'init');

    this.alias(req, '', next);
  }

  context(req, res, next) {
    console.log('context');

    req.context = req.context || {};
    const resources = ['form', 'submission', 'role'];

    const parts = req.path.split('/');
    // Throw away the first empty item.
    parts.shift();

    const loads = [];
    parts.forEach((part, index) => {
      if (resources.includes(part) && (index + 2) <= parts.length) {
        loads.push(this.db.read(part + 's', {
          _id: new ObjectID(parts[index + 1])
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
    console.log('authenticate');
    next();
  }

  access(req, res, next) {
    console.log('access');
    next();
  }

  beforeExecute(req, res, next) {
    console.log('beforeExecute');
    next();
  }

  afterExecute(req, res, next) {
    console.log('afterExecute');
    next();
  }

  respond(req, res, next) {
    console.log('response');
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
