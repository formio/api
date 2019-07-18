'use strict';

const Resource = require('../libraries/Resource');

module.exports = class Event extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
  }
};
