const assert = require('chai').assert;
const sinon = require('sinon');

// A fake db wrapper for stubbing.
const db = require('../test/mocks/db');
const sandbox = sinon.createSandbox();

const Model = require('../libraries/Model');
const Form = require('./Form');

describe('Form Schema', () => {
  const model = new Model(Form, db);

  afterEach(() => {
    sandbox.restore();
  });

  it('tests', done => {
    done();
  });
});