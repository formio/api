import Swagger from './Swagger';

export default class RouteSwagger extends Swagger {
  constructor(baseRoute: string, private method: string) {
    super(baseRoute);
  }

  public getJson() {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(this.method)) {
      return null;
    }

    return {
      tags: {
        name: this.baseRoute,
      },
      paths: {
        ...this.getPaths(),
      },
    };
  }

  private getPaths() {
    return {
      [this.baseRoute]: {
        ...this.getMethodPaths(),
      },
    };
  }

  private getMethodPaths() {
    return {
      [this.method]: {
        tags: [this.baseRoute],
        description: `${this.method.toUpperCase()} request to ${this.baseRoute}`,
        operationId: `${this.method}${this.baseRoute}`,
        summary: `${this.method.toUpperCase()} ${this.baseRoute}`,
      },
    };
  }
}
