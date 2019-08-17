module.exports = class Route {
  static get method() {
    return 'get';
  }

  static get path() {
    return '';
  }

  static get rootOnly() {
    return false;
  }

  constructor(app) {
    this.app = app;
  }

  execute(req, res, next) {
    return next();
  }
};
