'use strict'

const Resource = require('../libraries/Resource');
const Model = require('../libraries/Model');

module.exports = class Action extends Resource {
  constructor(model, router, options) {
    super(model, router, options);
  }
};
