import {expect} from 'chai';
import * as sinon from 'sinon';

import {Express} from '../../test/mocks/Express';
import {Database} from '../dbs/Database';
import {Api} from '../FormApi';

import {ResourceSwagger} from './ResourceSwagger';

const router: any = new Express();
const db = new Database();
const app = new Api(router, db, {});

const actionModel = app.models.Action;

const name = 'test';
const methods = ['index', 'post', 'get', 'put', 'patch', 'delete'];
const baseRoute = '/base/:baseId/resource';

const requestBodyName = `${name}Body`;
const resourceListName = `${name}List`;

const paths = {
  [baseRoute]: {
    get: {
      tags: [name],
      description: 'index get',
    },
    post: {
      tags: [name],
      description: 'index post',
    },
  },
  [`${baseRoute}/${actionModel.name}Id`]: {
    get: {
      tags: [name],
      description: 'get',
    },
    put: {
      tags: [name],
      description: 'put',
    },
    patch: {
      tags: [name],
      description: 'patch',
    },
    delete: {
      tags: [name],
      description: 'delete',
    },
  },
};

const requestBody = {
  [requestBodyName]: {
    description: `A JSON object containing ${name} information`,
    required: true,
    content: {
      'application/json': {
        schema: {
          $ref: `#/components/schemas/${name}`,
        },
      },
    },
  },
};

const schema = {
  [name]: {
    field: {type: 'test'},
  },
};

const listSchema = {
  [resourceListName]: {
    type: 'array',
    items: {$ref: `#/components/schemas/${name}`},
  },
};

const swaggerInfo = {
  tags: {name},
  paths,
  components: {
    requestBodies: {
      ...requestBody,
    },
    schemas: {
      ...schema,
      ...listSchema,
    },
  },
};

describe('ResourceSwagger', () => {
  let swagger = new ResourceSwagger(baseRoute, name, methods, actionModel);

  let getPathsStub: sinon.SinonStub;
  let getRequestBodyStub: sinon.SinonStub;
  let getSchemaStub: sinon.SinonStub;
  let getListSchemaStub: sinon.SinonStub;

  beforeEach(() => {
    getPathsStub = sinon.stub((swagger as any), 'getPaths').returns(paths);
    getRequestBodyStub = sinon.stub((swagger as any), 'getRequestBody').returns(requestBody);
    getSchemaStub = sinon.stub((swagger as any), 'getSchema').returns(schema);
    getListSchemaStub = sinon.stub((swagger as any), 'getListSchema').returns(listSchema);
  });

  afterEach(() => {
    getPathsStub.restore();
    getRequestBodyStub.restore();
    getSchemaStub.restore();
    getListSchemaStub.restore();
  });

  it('Returns correct json', () => {
    const json = swagger.getJson();
    expect(json).eql(swaggerInfo);
  });

  it('Returns correct request body', () => {
    getRequestBodyStub.restore();
    const json = swagger.getJson();

    expect(json.components.requestBodies).eql(requestBody);
  });

  it('Returns correct schemas', () => {
    getSchemaStub.restore();
    getListSchemaStub.restore();

    const getResourceSchemaStub = sinon.stub((swagger as any), 'getResourceSchema').returns(schema);
    const json = swagger.getJson();

    expect(json.components.schemas).eql({
      ...schema,
      ...listSchema,
    });

    getResourceSchemaStub.restore();
  });

  describe('Method Paths', () => {
    beforeEach(() => {
      getPathsStub.restore();
    });

    it('Resolves index paths', () => {
      const filteredMethods = methods.filter((method) => method !== 'index');
      swagger = new ResourceSwagger(baseRoute, name, filteredMethods, actionModel);
      const getIndexPathsSpy = sinon.spy((swagger as any), 'getIndexPaths');

      swagger.getJson();
      expect(getIndexPathsSpy.returnValues[0]).eql(null);

      getIndexPathsSpy.restore();
    });

    it('Resolves post paths', () => {
      const filteredMethods = methods.filter((method) => method !== 'post');
      swagger = new ResourceSwagger(baseRoute, name, filteredMethods, actionModel);
      const getPostPathsSpy = sinon.spy((swagger as any), 'getPostPaths');

      swagger.getJson();
      expect(getPostPathsSpy.returnValues[0]).eql(null);

      getPostPathsSpy.restore();
    });

    it('Resolves item paths', () => {
      const filteredMethods = methods.filter((method) => method !== 'get');
      swagger = new ResourceSwagger(baseRoute, name, filteredMethods, actionModel);
      const getItemPathsSpy = sinon.spy((swagger as any), 'getItemPaths');

      swagger.getJson();
      expect(getItemPathsSpy.returnValues[0]).eql(null);

      getItemPathsSpy.restore();
    });

    it('Resolves put paths', () => {
      const filteredMethods = methods.filter((method) => method !== 'put');
      swagger = new ResourceSwagger(baseRoute, name, filteredMethods, actionModel);
      const getPutPathsSpy = sinon.spy((swagger as any), 'getPutPaths');

      swagger.getJson();
      expect(getPutPathsSpy.returnValues[0]).eql(null);

      getPutPathsSpy.restore();
    });

    it('Resolves patch paths', () => {
      const filteredMethods = methods.filter((method) => method !== 'patch');
      swagger = new ResourceSwagger(baseRoute, name, filteredMethods, actionModel);
      const getPatchPathsSpy = sinon.spy((swagger as any), 'getPatchPaths');

      swagger.getJson();
      expect(getPatchPathsSpy.returnValues[0]).eql(null);

      getPatchPathsSpy.restore();
    });

    it('Resolves delete paths', () => {
      const filteredMethods = methods.filter((method) => method !== 'delete');
      swagger = new ResourceSwagger(baseRoute, name, filteredMethods, actionModel);
      const getDeletePathsSpy = sinon.spy((swagger as any), 'getDeletePaths');

      swagger.getJson();
      expect(getDeletePathsSpy.returnValues[0]).eql(null);

      getDeletePathsSpy.restore();
    });
  });

  describe('Paths', () => {
    const stubs = {};
    const stubNames = [
      'getIndexPaths', 'getPostPaths', 'getItemPaths', 'getPutPaths', 'getPatchPaths', 'getDeletePaths',
    ];

    beforeEach(() => {
      stubNames.forEach((name) => {
        const stub = sinon.stub((swagger as any), name).returns({});
        stubs[name] = stub;
      });
    });

    afterEach(() => {
      stubNames.forEach((name) => stubs[name].restore());
    });

    it('Resolves paths names', () => {
      getPathsStub.restore();

      const listPath = baseRoute;
      const itemPath = `${baseRoute}/{${actionModel.name}Id}`;

      const json = swagger.getJson();

      expect(json.paths[listPath]).eql({});
      expect(json.paths[itemPath]).eql({});
    });

    it('Resolves paths names with provided id', () => {
      const id = '123';
      const listPath = baseRoute;
      const itemPath = `${baseRoute}/${id}`;

      swagger = new ResourceSwagger(baseRoute, name, methods, actionModel, id);

      stubNames.forEach((name) => {
        const stub = sinon.stub((swagger as any), name).returns({});
        stubs[name] = stub;
      });

      const json = swagger.getJson();

      expect(json.paths[listPath]).eql({});
      expect(json.paths[itemPath]).eql({});

      stubNames.forEach((name) => stubs[name].restore());
    });
  });
});
