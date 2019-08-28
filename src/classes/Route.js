module.exports = class Route {
  constructor(app, base) {
    this.app = app;
    this.base = base;
  }

  get method() {
    return 'get';
  }

  get path() {
    return this.base;
  }

  /**
   * Return either true, false or pass. Pass continues with normal authorization checks.
   *
   * @param req
   * @returns {string}
   */
  authorize(req) {
    return 'pass';
  }

  register(router, base) {
    router[this.method](this.path, (req, res, next) => {
      return this.execute(req, res, next);
    });
  }

  execute(req, res, next) {
    return next();
  }
};
