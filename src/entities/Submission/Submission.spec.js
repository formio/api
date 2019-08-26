const assert = require('chai').assert;
const sinon = require('sinon');

// A fake db wrapper for stubbing.
const db = require('../../../test/mocks/db');
const sandbox = sinon.createSandbox();

const Model = require('../../dbs/Model');
const Schema = require('./Schema');

describe('Submission Tests', () => {
  const model = new Model(new Schema(), db);

  afterEach(() => {
    sandbox.restore();
  });

  it('tests', done => {
    done();
  });
});
