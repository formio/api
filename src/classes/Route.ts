import {Api} from '../FormApi';
import RouteSwagger from './RouteSwagger';
import Swagger from './Swagger';

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

    const tag = this.app.swagger.tags.find((tag: any) => {
      return tag.name === swagger.tags.name;
    });

    if (!tag) {
      this.app.swagger.tags.push(swagger.tags);
    }

    this.app.swagger.paths = {
      ...this.app.swagger.paths,
      ...swagger.paths,
    };
  }

  public execute(req, res, next) {
    return next();
  }

  public swagger() {
    const swagger: Swagger = new RouteSwagger(this.path, this.method);
    return swagger.getJson();
  }
}
