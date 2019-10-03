import {assert} from 'chai';
import 'mocha-typescript';
import * as sinon from 'sinon';

// A fake db wrapper for stubbing.
const sandbox = sinon.createSandbox();

// import {Resource as Schema} from './Schema';
import app from '../../../test/mocks/app';
import db from '../../../test/mocks/db';
import {Model} from '../../dbs/Model';

describe('Resource Tests', () => {
  // const model = new Model(new Schema(app), db);

  afterEach(() => {
    sandbox.restore();
  });

  it('tests', (done) => {
    done();
  });
});
