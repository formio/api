import {Model} from '../dbs';
import {Swagger} from './Swagger';

export class ResourceSwagger extends Swagger {
  get defaultPathParams(): any[] {
    if (this.id) {
      return [];
    }

    return [
      {
        name: `${this.model.name}Id`,
        in: 'path',
        description: `The ID of the ${this.model.name}.`,
        schema: {
          type: 'string',
        },
        required: true,
      },
    ];
  }

  get defaultQueryParams(): any[] {
    return [
      {
        name: 'skip',
        in: 'query',
        description: 'How many records to skip when listing. Used for pagination.',
        schema: {
          type: 'integer',
          default: 0,
        },
        required: false,
      },
      {
        name: 'limit',
        in: 'query',
        description: 'How many records to limit the output.',
        schema: {
          type: 'integer',
          default: 10,
        },
        required: false,
      },
      {
        name: 'sort',
        in: 'query',
        description: 'Which fields to sort the records on.',
        schema: {
          type: 'string',
          default: '',
        },
        required: false,
      },
      {
        name: 'select',
        in: 'query',
        description: 'Select which fields will be returned by the query.',
        schema: {
          type: 'string',
          default: '',
        },
        required: false,
      },
      {
        name: 'populate',
        in: 'query',
        description: 'Select which fields will be fully populated with the reference.',
        schema: {
          type: 'string',
          default: '',
        },
        required: false,
      },
    ];
  }

  private requestBodyName: string;
  private resourceListName: string;

  constructor(
    baseRoute: string,
    protected name: string,
    protected methods: string[],
    protected model: Model,
    protected id: string = null,
  ) {
    super(baseRoute);

    this.requestBodyName = `${name}Body`;
    this.resourceListName = `${name}List`;
  }

  public getJson() {
    return {
      tags: {
        name: this.name,
      },
      paths: this.getPaths(),
      components: {
        requestBodies: {
          ...this.getRequestBody(),
        },
        schemas: {
          ...this.getSchema(),
          ...this.getListSchema(),
        },
      },
    };
  }

  protected getPaths() {
    const listPath = this.baseRoute;
    const itemPath = this.id ? `${this.baseRoute}/${this.id}` : `${this.baseRoute}/{${this.model.name}Id}`;

    return {
      [listPath]: {
        ...this.getIndexPaths(),
        ...this.getPostPaths(),
      },
      [itemPath]: {
        ...this.getItemPaths(),
        ...this.getPutPaths(),
        ...this.getPatchPaths(),
        ...this.getDeletePaths(),
      },
    };
  }

  protected getRequestBody() {
    return {
      [this.requestBodyName]: {
        description: `A JSON object containing ${this.name} information`,
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${this.name}`,
            },
          },
        },
      },
    };
  }

  protected getSchema() {
    return {
      ...this.getResourceSchema(this.model.schema.schema, this.name),
    };
  }

  private getIndexPaths(): any {
    if (!this.methods.includes('index')) {
      return null;
    }

    const paths = {
      get: {
        tags: [this.name],
        description: `This operation allows you to list and search for ${this.name} ` +
          'resources provided query arguments.',
        operationId: `get${this.name}s`,
        summary: `List multiple ${this.name} resources`,
        responses: {
          200: {
            description: 'Resource(s) found.  Returned as array.',
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${this.resourceListName}`,
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
          },
        },
        parameters: [...this.defaultQueryParams],
      },
    };

    this.addNestedIdParameter(paths.get.parameters);
    return paths;
  }

  private getPostPaths(): any {
    if (!this.methods.includes('post')) {
      return null;
    }

    const paths = {
      post: {
        tags: [this.name],
        description: `Create a new ${this.name}`,
        operationId: `create${this.name}`,
        summary: `Create a new ${this.name}`,
        responses: {
          201: {
            description: 'The resource has been created.',
          },
          400: {
            description: 'An error has occured trying to create the resource.',
          },
          401: {
            description: 'Unauthorized.  Note that anonymous submissions are *enabled* by default.',
          },
        },
        requestBody: {
          $ref: `#/components/requestBodies/${this.requestBodyName}`,
        },
        parameters: [],
      },
    };

    this.addNestedIdParameter(paths.post.parameters);
    return paths;
  }

  private getItemPaths(): any {
    if (!this.methods.includes('get')) {
      return null;
    }

    const paths = {
      get: {
        tags: [this.name],
        description: `Return a specific ${this.name} instance.`,
        operationId: `get${this.name}`,
        summary: `Return a specific ${this.name} instance.`,
        responses: {
          200: {
            description: 'Resource found',
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${this.name}`,
                },
              },
            },
          },
          401: {
            description: 'Unauthorized.',
          },
          404: {
            description: 'Resource not found',
          },
          500: {
            description: 'An error has occurred.',
          },
        },
        parameters: [...this.defaultPathParams],
      },
    };

    this.addNestedIdParameter(paths.get.parameters);
    return paths;
  }

  private getPutPaths(): any {
    if (!this.methods.includes('put')) {
      return null;
    }

    const paths = {
      put: {
        tags: [this.name],
        description: `Update a specific ${this.name} instance.`,
        operationId: `update${this.name}`,
        summary: `Update a specific ${this.name} instance.`,
        responses: {
          200: {
            description: 'Resource updated',
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${this.name}`,
                },
              },
            },
          },
          400: {
            description: 'Resource could not be updated.',
          },
          401: {
            description: 'Unauthorized.',
          },
          404: {
            description: 'Resource not found',
          },
          500: {
            description: 'An error has occurred.',
          },
        },
        requestBody: {
          $ref: `#/components/requestBodies/${this.requestBodyName}`,
        },
        parameters: [...this.defaultPathParams],
      },
    };

    this.addNestedIdParameter(paths.put.parameters);
    return paths;
  }

  private getPatchPaths(): any {
    if (!this.methods.includes('patch')) {
      return null;
    }

    const paths = {
      patch: {
        tags: [this.name],
        description: `Patch a specific ${this.name} instance.`,
        operationId: `patch${this.name}`,
        summary: `Patch a specific ${this.name} instance.`,
        responses: {
          200: {
            description: 'Resource patched',
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${this.name}`,
                },
              },
            },
          },
          400: {
            description: 'Resource could not be patched.',
          },
          401: {
            description: 'Unauthorized.',
          },
          404: {
            description: 'Resource not found',
          },
          500: {
            description: 'An error has occurred.',
          },
        },
        requestBody: {
          $ref: `#/components/requestBodies/${this.requestBodyName}`,
        },
        parameters: [...this.defaultPathParams],
      },
    };

    this.addNestedIdParameter([paths.patch.parameters]);
    return paths;
  }

  private getDeletePaths(): any {
    if (!this.methods.includes('delete')) {
      return null;
    }

    const paths = {
      delete: {
        tags: [this.name],
        description: `Delete a specific ${this.name}`,
        operationId: `delete${this.name}`,
        summary: `Delete a specific ${this.name}`,
        responses: {
          204: {
            description: 'Resource was deleted',
          },
          400: {
            description: 'Resource could not be deleted.',
          },
          401: {
            description: 'Unauthorized.',
          },
          404: {
            description: 'Resource not found',
          },
          500: {
            description: 'An error has occurred.',
          },
        },
        parameters: [...this.defaultPathParams],
      },
    };

    this.addNestedIdParameter(paths.delete.parameters);
    return paths;
  }

  private getListSchema() {
    return {
      [this.resourceListName]: {
        type: 'array',
        items: {
          $ref: `#/components/schemas/${this.name}`,
        },
      },
    };
  }

  private getResourceSchema(schema: any, modelName: string) {
    const schemas = {};

    schemas[modelName] = {
      title: modelName,
      properties: {},
      required: [],
    };

    Object.keys(schema).forEach((name) => {
      if (name.substr(0, 2) === '__') {
        return;
      }

      const value = schema[name];
      const property = this.getProperty(value, name);

      if (!property) {
        return;
      }

      if (value.description) {
        property.description = value.description;
      }

      if (value.example) {
        property.example = value.example;
      }

      if (value.required) {
        schemas[modelName].required.push(name);
      }

      if (!isNaN(value.min)) {
        property.minimum = value.min;
      }

      if (!isNaN(value.max)) {
        property.maximum = value.max;
      }

      if (!property.type && !property.$ref) {
        property.type = 'string';
      }

      schemas[modelName].properties[name] = property;
    });

    return schemas;
  }

  private getProperty(value: any, name: string): any {
    let options = value;

    if (!options.hasOwnProperty('type')) {
      options = {type: options};
    }

    if (Array.isArray(options.type)) {
      if (options.type[0].hasOwnProperty('paths')) {
        return {
          type: 'array',
          title: this.name,
          items: {
            $ref: `#/components/schemas/${name}`,
          },
          definitions: this.getResourceSchema(options.type[0], name),
        };
      }

      return {
        type: 'array',
        items: {
          type: 'string',
        },
      };
    }

    if (options.type.constructor.name === 'Schema') {
      if (options.type.hasOwnProperty('paths')) {
        return {
          $ref: `#/components/schemas/${name}`,
          definitions: this.getResourceSchema(options.type, name),
        };
      }
    }

    switch (options.type) {
      case 'id':
        return {
          type: 'string',
          description: 'ObjectId',
        };
      case 'string':
        return {
          type: 'string',
        };
      case 'number':
        return {
          type: 'integer',
          format: 'int64',
        };
      case 'date':
        return {
          type: 'string',
          format: 'date',
        };
      case 'boolean':
        return {
          type: 'boolean',
        };
    }

    if (typeof options.type === 'function') {
      let functionName = options.type.toString();
      functionName = functionName.substr('function '.length);
      functionName = functionName.substr(0, functionName.indexOf('('));

      switch (functionName) {
        case 'ObjectId':
          return {
            type: 'string',
            description: 'ObjectId',
          };
        case 'Oid':
          return {
            type: 'string',
            description: 'Oid',
          };
        case 'Array':
          return {
            type: 'array',
            items: {
              type: 'string',
            },
          };
        case 'Mixed':
          return {
            type: 'object',
          };
        case 'Buffer':
          return {
            type: 'string',
          };
        case 'String':
          return {
            type: 'string',
          };
      }
    }

    switch (options.type) {
      case String:
        return {
          type: 'string',
        };
      case Number:
        return {
          type: 'integer',
          format: 'int64',
        };
      case Date:
        return {
          type: 'string',
          format: 'date',
        };
      case Boolean:
        return {
          type: 'boolean',
        };
      case Function:
        break;
      case Object:
        return null;
    }

    if (options.type instanceof Object) {
      return null;
    }

    throw new Error(`Unrecognized type: ${options.type}`);
  }

  private addNestedIdParameter(parameters: any[]) {
    if (this.baseRoute && this.baseRoute.includes('/:')) {
      if (this.baseRoute.match(/:(.+)\//).length >= 1 && this.baseRoute.match(/^\/(.+)\/\:/).length >= 1) {
        const idName = this.baseRoute.match(/:(.+)\//)[1];
        const primaryModel = this.baseRoute.match(/^\/(.+)\/\:/)[1];

        parameters.push({
          name: idName,
          in: 'path',
          description: `The parent model of ${this.name}: ${primaryModel}.`,
          schema: {
            type: 'string',
          },
          required: true,
        });
      }
    }
  }
}
