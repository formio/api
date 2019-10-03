import {assert} from 'chai';
import * as sinon from 'sinon';

// A fake db wrapper for stubbing.
const sandbox = sinon.createSandbox();

import {Express} from '../../../test/mocks/Express';
import {Database} from '../../dbs/Database';
import {Model} from '../../dbs/Model';
import {Api} from '../../FormApi';
// import {Form as Schema} from './Schema';

const router: any = new Express();
const db = new Database();
const app = new Api(router, db, {});

describe('Resource Tests', () => {
  // const model = new Model(new Schema(app), db);

  afterEach(() => {
    sandbox.restore();
  });

  it('tests', (done) => {
    done();
  });
});
