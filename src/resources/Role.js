'use strict'

const Resource = require('../libraries/Resource');

module.exports = class Role extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
  }
};
