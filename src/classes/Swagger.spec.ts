import {expect} from 'chai';

import {Swagger} from './Swagger';

const name = 'test name';
const version = '1.0.0';

const mockInfo = {
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

const paths = {
  testPaths: {
    get: {description: 'get'},
    post: {description: 'post'},
  },
};

const schemas = {
  model: {
    field: {
      type: 'string',
    },
  },
};

const requestBodies = {
  requestBody: {
    date: {
      type: 'string',
      format: 'date',
    },
  },
};

describe('Swagger', () => {
  it('Gets common info', () => {
    const swaggerInfo = Swagger.getInfo({name, version});
    expect(swaggerInfo).eql(mockInfo);
  });

  describe('Extend Info', () => {
    let info: any;

    beforeEach(() => {
      info = Swagger.getInfo({name, version});
    });

    it('Doesn\'t mutate origin info without extend values', () => {
      Swagger.extendInfo(info);
      expect(info).eql(mockInfo);
    });

    it('Extends info correctly if extend tags property is not array', () => {
      const extend = {tags: {name: 'test'}};
      Swagger.extendInfo(info, extend);

      expect(info.tags).eql([{name: 'test'}]);
    });

    it('Extends info with unique tags', () => {
      const firstExtend = {tags: {name: 'test'}};
      const secondExtend = {tags: {name: 'test'}};

      Swagger.extendInfo(info, firstExtend, secondExtend);

      expect(info.tags).eql([{name: 'test'}]);
    });

    describe('Correct Fields Extension', () => {
      let extend: any;

      beforeEach(() => {
        extend = {
          paths: {...paths},
          components: {
            schemas: {...schemas},
            requestBodies: {...requestBodies},
          },
        };

        Swagger.extendInfo(info, extend);
      });

      it('Extends paths', () => {
        expect(info.paths).eql(paths);
      });

      it('Extends schemas', () => {
        expect(info.components.schemas).eql(schemas);
      });

      it('Extends requestBodies', () => {
        expect(info.components.requestBodies).eql(requestBodies);
      });
    });
  });
});
