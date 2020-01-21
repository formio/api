// We can't use import for package.json or it will mess up the lib folder.
/* tslint:disable */
const {name, version} = require('../../package.json');

import {Route} from '../classes';

export class Spec extends Route {
  get method() {
    return 'get';
  }

  get path() {
    return '/spec.json';
  }

  get description() {
    return 'OpenAPI 3.0 spec';
  }

  get responses() {
    return {
      200: {
        description: 'OK',
        content: {
          'application/json': {},
        },
      },
    };
  }

  public execute(req, res, next) {
    const json = {
      openapi: '3.0.0',
      info: {
        title: name,
        contact: {
          name: 'Form.io Support',
        },
        license: {
          name: 'MIT',
        },
        version: version,
      },
      ...this.app.swagger,
    }

    return res.json(json).status(200);
  }
}
