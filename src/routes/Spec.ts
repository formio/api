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

  public execute(req, res, next) {
    const json = {
      openapi: '3.0.0',
      info: {
        title: name,
        // termsOfService: 'http://blog.form.io/form-terms-of-use',
        contact: {
          name: 'Form.io Support',
          // url: 'http://help.form.io/',
          // email: 'support@form.io',
        },
        license: {
          name: 'MIT',
          // url: 'http://opensource.org/licenses/MIT',
        },
        version: version,
      },
      ...this.app.swagger,
    }

    return res.json(json).status(200);
  }
}
