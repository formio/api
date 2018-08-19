'use strict'

const Resource = require('../libraries/Resource');

module.exports = class Action extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
    this.register('use', '/form/:formId/actions', 'actions');
    this.register('use', '/form/:formId/actions/:name', 'loadAction');
  }

  get route() {
    return '/form/:formId/' + this.name;
  }

  getQuery(req, query = {}) {
    query.form = this.model.toID(req.params.formId);
    return super.getQuery(req, query);
  }

  actions(req, res, next) {
    next();
  }

  loadAction(req, res, next) {
    next();
  }
};
