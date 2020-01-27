import {expect} from 'chai';
import * as sinon from 'sinon';

import {RouteSwagger} from './RouteSwagger';

const baseRoute = '/base';
const method = 'get';
const description = 'test description';
const responses = {
  200: {
    description: 'OK',
    content: {
      'application/json': {},
    },
  },
};

const methodPaths = {
  [method]: {
    tags: baseRoute,
    description,
  },
};

const paths = {
  [baseRoute]: {
    ...methodPaths,
  },
};

describe('RouteSwagger', () => {
  let swagger: RouteSwagger;

  beforeEach(() => {
    swagger = new RouteSwagger(baseRoute, method, description, responses);
  });

  describe('Swagger Info', () => {
    it('Returns object for valid method', () => {
      const json = swagger.getJson();
      expect(json).to.not.be.null; // tslint:disable-line no-unused-expression
    });

    it('Returns null if method is not valid', () => {
      const invalidMethod = 'use';

      swagger = new RouteSwagger(baseRoute, invalidMethod, description, responses);
      const json = swagger.getJson();

      expect(json).to.be.null; // tslint:disable-line no-unused-expression
    });

    it('Returns valid json', () => {
      const tags = {name: baseRoute};
      const getPathsStub = sinon.stub((swagger as any), 'getPaths').returns(paths);
      const json = swagger.getJson();

      expect(json.tags).eql(tags);
      expect(json.paths).eql(paths);

      getPathsStub.restore();
    });
  });

  describe('Paths', () => {
    it('Returns correct paths', () => {
      const getPathsStub = sinon.stub((swagger as any), 'getPaths').returns(paths);
      const json = swagger.getJson();

      expect(getPathsStub.calledOnce).to.be.true; // tslint:disable-line no-unused-expression
      expect(json.paths).eql(paths);

      getPathsStub.restore();
    });
  });

  describe('Method Paths', () => {
    it('Returns correct method paths', () => {
      const getMethodPathsStub = sinon.stub((swagger as any), 'getMethodPaths')
        .returns(methodPaths);

      const json = swagger.getJson();

      expect(getMethodPathsStub.calledOnce).to.be.true; // tslint:disable-line no-unused-expression
      expect(json.paths).eql(paths);

      getMethodPathsStub.restore();
    });
  });
});
