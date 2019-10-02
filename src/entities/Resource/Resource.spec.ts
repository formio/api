import 'mocha-typescript';
import {assert} from 'chai';
import * as sinon from 'sinon';

// A fake db wrapper for stubbing.
const sandbox = sinon.createSandbox();

import {Model} from '../../dbs/Model';
// import {Resource as Schema} from './Schema';
import app from '../../../test/mocks/app';
import db from '../../../test/mocks/db';

describe('Resource Tests', () => {
  // const model = new Model(new Schema(app), db);

  afterEach(() => {
    sandbox.restore();
  });

  it('tests', done => {
    done();
  });
});
