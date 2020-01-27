import {Api} from '../FormApi';
import {RouteSwagger} from './RouteSwagger';
import {Swagger} from './Swagger';

export class Route {
  protected app: Api;
  protected base: string;

  constructor(app: Api, base: string) {
    this.app = app;
    this.base = base;
  }

  get method() {
    return 'get';
  }

  get path() {
    return this.base;
  }

  get description() {
    return '';
  }

  get responses() {
    return {};
  }

  /**
   * Return either true, false or pass. Pass continues with normal authorization checks.
   *
   * @param req
   * @returns {string}
   */
  public authorize(req): string | boolean {
    return 'pass';
  }

  public register(router, base) {
    router[this.method](this.path, (req, res, next) => {
      return this.execute(req, res, next);
    });

    const swagger = this.swagger();

    if (!swagger) {
      return;
    }

    Swagger.extendInfo(this.app.swagger, swagger);
  }

  public execute(req, res, next) {
    return next();
  }

  public swagger() {
    const swagger: Swagger = new RouteSwagger(
      this.path,
      this.method,
      this.description,
      this.responses,
    );

    return swagger.getJson();
  }
}
