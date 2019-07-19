const assert = require('chai').assert;
const sinon = require('sinon');

// A fake db wrapper for stubbing.
const db = require('../../../test/mocks/db');
const sandbox = sinon.createSandbox();

const Model = require('../../libraries/Model');
const Action = require('./schema');

describe('Action Tests', () => {
  const model = new Model(Action, db);

  afterEach(() => {
    sandbox.restore();
  });

  it('tests', done => {
    done();
  });
});
