module.exports = class Route {
  static get method() {
    return 'get';
  }

  static get path() {
    return '';
  }

  constructor(app) {
    this.app = app;
  }

  execute(req, res, next) {
    return next();
  }
};
