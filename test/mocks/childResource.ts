import * as cm from 'composable-middleware';
import {Resource} from '../../src/classes';

// @Todo
// swagger

export class Child extends Resource {
  constructor(model, router, options) {
    super(model, router, options);
    this.register('use', this.route + '/test', 'test');
  }

  get route() {
    return '/foo' + super.route;
  }

  public test(req, res, next) {
    next();
  }

  public before(req, res, next) {
    next();
  }

  public after(req, res, next) {
    next();
  }

  public post(req, res, next) {
    cm(this.before, super.post, this.after).call(this, req, res, next);
  }
}
