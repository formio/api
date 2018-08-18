'use strict'

const Resource = require('../libraries/Resource');

module.exports = class Submission extends Resource {
  constructor(model, router) {
    super(model, router);
    this.register('use', this.route + '/exists', 'exists');
  }

  get route() {
    return '/form/:formId/' + this.name;
  }

  getQuery(req, query = {}) {
    query.form = this.model.toID(req.params.formId);
    return super.getQuery(req, query);
  }

  exists(req, res, next) {
    next();
  }
  //
  // index(req, res, next) {
  //
  // }
};
