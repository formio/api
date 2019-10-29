import {assert} from 'chai';
import * as sinon from 'sinon';

import {Express} from '../../test/mocks/Express';
import {Database} from '../dbs/Database';
import {Api} from '../FormApi';
import {Export} from './Export';
import {Model} from '../dbs/Model';
import {Porter} from './Porter';
import {Schema} from './Schema';

const router: any = new Express();
const db = new Database();
const app = new Api(router, db, {});

const sandbox = sinon.createSandbox();

class ASchema extends Schema {
  get name() {
    return 'a';
  }
}

class BSchema extends Schema {
  get name() {
    return 'b';
  }
}

class APorter extends Porter {
  get key() {
    return 'a';
  }

  get model() {
    return this.app.models.A;
  }
}

class BPorter extends Porter {
  get key() {
    return 'b';
  }

  get model() {
    return this.app.models.B;
  }
}

describe('Export.js', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('Instantiates Export', (done) => {
    const action = new Export(app, <any> {});
    done();
  });
});
