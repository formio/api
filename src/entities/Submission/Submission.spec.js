const assert = require('chai').assert;
const sinon = require('sinon');

// A fake db wrapper for stubbing.
const db = require('../../../test/mocks/db');
const sandbox = sinon.createSandbox();

const Model = require('../../libraries/Model');
const Submission = require('./schema');

describe('Submission Tests', () => {
  const model = new Model(Submission, db);

  afterEach(() => {
    sandbox.restore();
  });

  it('tests', done => {
    done();
  });
});
