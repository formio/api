'use strict'

const Resource = require('../libraries/Resource');
const Model = require('../libraries/Model');

module.exports = class Submission extends Resource {
  constructor(model, router, options) {
    super(model, router, options);
  }

  get route() {
    return 'form/:formId/' + this.name;
  }
};
