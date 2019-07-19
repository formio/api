const cm = require('composable-middleware');
const Resource = require('../../src/Classes/Resource');

// @Todo
// swagger

module.exports = class Child extends Resource {
  constructor(model, router, options) {
    super(model, router, options);
    this.register('use', this.route + '/test', 'test');
  }

  get route() {
    return '/foo' + super.route;
  }

  test(req, res, next) {
    next();
  }

  before(req, res, next) {
    next();
  }

  after(req, res, next) {
    next();
  }

  post(req, res, next) {
    cm(this.before, super.post, this.after).call(this, req, res, next);
  }
};
