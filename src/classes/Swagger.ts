export abstract class Swagger {
  get baseRoute() {
    return this._baseRoute;
  }

  set baseRoute(value) {
    this._baseRoute = value;
  }

  public static getInfo({name, version}) {
    return {
      openapi: '3.0.0',
      info: {
        title: name,
        contact: {
          name: 'Form.io Support',
        },
        license: {name: 'MIT'},
        version,
      },
      tags: [],
      components: {
        securitySchemes: {
          bearer: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
          },
        },
      },
      security: [
        {
          bearer: [],
        },
      ],
    };
  }

  public static extendInfo(info: any, ...extend: any[]) {
    const infoTagNames = info.tags.map((tag: any) => tag.name);

    extend.forEach((extendItem) => {
      if (!extendItem) {
        return;
      }

      extendItem.tags = extendItem.tags || [];
      if (!Array.isArray(extendItem.tags)) {
        extendItem.tags = [extendItem.tags];
      }

      const uniqueTags = extendItem.tags.filter(({name}) => !infoTagNames.includes(name));
      extendItem.components = extendItem.components || {schemas: {}, requestBodies: {}};

      info.tags = [...info.tags, ...uniqueTags];
      info.paths = {...info.paths, ...extendItem.paths};
      info.components.schemas = {...info.components.schemas, ...extendItem.components.schemas};
      info.components.requestBodies = {...info.components.requestBodies, ...extendItem.components.requestBodies};
    });
  }

  constructor(private _baseRoute: string) {}

  public abstract getJson(): any;
}
