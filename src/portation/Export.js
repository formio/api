'use strict';

module.exports = class Export {
  constructor(app, porters) {
    this.app = app;
    this.porters = porters;
  }

  export() {
    return 'test';
  }
};
