const assert = require('chai').assert;
const sinon = require('sinon');

// A fake db wrapper for stubbing.
const db = require('../test/db');
const sandbox = sinon.createSandbox();

const Model = require('./Model');

describe('Model.js', () => {
  afterEach(() => {
    sandbox.restore();
  });

  describe('Initialization', () => {
    it('Creates a collection if it doesnt exist', () => {
      sandbox.stub(db, 'createCollection').resolves();

      const model = new Model({
        name: 'test',
        schema: {}
      }, db);

      return model.initialized.then(() => {
        assert(db.createCollection.calledOnce, 'Should call createCollection');
        assert.equal(db.createCollection.args[0][0], 'tests');
      });
    });

    it('Doesnt create a collection if it exists', () => {
      sandbox.stub(db, 'getCollections').resolves(['tests']);
      sandbox.stub(db, 'createCollection').resolves();

      const model = new Model({
        name: 'test',
        schema: {}
      }, db);

      return model.initialized.then(() => {
        assert(!db.createCollection.calledOnce, 'Should not call createCollection');
      });
    });

    it('Creates indexes', () => {
      sandbox.stub(db, 'createIndex');

      const testIndex = {
        name: 'deleted',
        spec: {
          a: 1,
          b: 1
        },
        options: {
          test: 1
        }
      };

      const model = new Model({
        name: 'test',
        schema: {
          a: {
            index: true
          },
          b: {
            index: true
          },
          c: {},
          d: {}
        },
        indexes: [testIndex]
      }, db);

      return model.initialized.then(() => {
        assert(db.createIndex.calledThrice, 'Should call createIndex thrice');
        assert.equal(db.createIndex.args[0][0], 'tests');
        assert.equal(db.createIndex.args[0][1], 'a');
        assert.equal(db.createIndex.args[1][0], 'tests');
        assert.equal(db.createIndex.args[1][1], 'b');
        assert.equal(db.createIndex.args[1][0], 'tests');
        assert.equal(db.createIndex.args[2][1], testIndex.spec);
        assert.equal(db.createIndex.args[2][2], testIndex.options);
      });
    });
  });

  describe('Type tests', () => {
    it('Creates ID type', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'id',
          },
        },
      }, db);

      return model.create({foo: 'bar'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.instanceOf(db.create.args[0][1].foo, db.ID, 'Should set the type');
        assert.instanceOf(doc.foo, db.ID, 'Should set the type');
      });
    });

    it('Enforces custom typing', () => {
      sandbox.spy(db, 'create');

      class ErrorClass {
        constructor(id) {
          throw 'id is bad';
        }
      }

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: ErrorClass,
          },
        },
      }, db);

      return model.create({foo: 'bar'}).catch(error => {
        assert.equal(error, '\'foo\' invalid type');
      });
    });

    it('Allows loose typing', () => {
      sandbox.spy(db, 'create');

      class ErrorClass {
        constructor(id) {
          throw 'id is bad';
        }
      };

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: ErrorClass,
            looseType: true,
          },
        },
      }, db);

      return model.create({foo: 'bar'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.isString(db.create.args[0][1].foo);
        assert.isString(doc.foo);
      });
    });

    it('Converts to string', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string'
          },
        },
      }, db);

      return model.create({
        foo: 3
      }).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.isString(db.create.args[0][1].foo);
        assert.equal(db.create.args[0][1].foo, '3');
        assert.isString(doc.foo);
        assert.equal(doc.foo, '3');
      });
    });

    it('Converts to integer', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'integer'
          },
        },
      }, db);

      return model.create({
        foo: '3'
      }).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.isNumber(db.create.args[0][1].foo);
        assert.equal(db.create.args[0][1].foo, 3);
        assert.isNumber(doc.foo);
        assert.equal(doc.foo, 3);
      });
    });

    it('Converts to date', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'date'
          },
        },
      }, db);

      return model.create({
        foo: '12-1-2018'
      }).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.instanceOf(db.create.args[0][1].foo, Date);
        assert.instanceOf(doc.foo, Date);
      });
    });

    it('Converts to boolean', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'boolean'
          },
        },
      }, db);

      return model.create({
        foo: '1'
      }).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.isBoolean(db.create.args[0][1].foo, 'should be boolean');
        assert.isBoolean(doc.foo, 'should be boolean');
      });
    });

    // nested type

    // nested schema
  });

  describe('Create Tests', () => {
    it('Fails required field when missing', () => {
      sandbox.stub(db, 'create').resolves({});

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            required: true
          },
        },
      }, db);

      return model.create({}).catch(error => {
        assert.equal(error, '\'foo\' is required');
      });
    });

    it('Requires a field', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            required: true
          },
        },
      }, db);

      return model.create({foo: 'bar'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'bar'});
        assert.deepEqual(doc, {foo: 'bar'});
      });
    });

    it('Removes extra values', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string'
          },
        },
      }, db);

      return model.create({foo: 'bar', baz: 'blah'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'bar'});
        assert.deepEqual(doc, {foo: 'bar'});
      });
    });

    it('Defaults a value', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            default: 'bar',
          },
        },
      }, db);

      return model.create({}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'bar'});
        assert.deepEqual(doc, {foo: 'bar'});
      });
    });

    it('Doesnt override with default with value', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            default: 'bar',
          },
        },
      }, db);

      return model.create({foo: 'baz'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'baz'});
        assert.deepEqual(doc, {foo: 'baz'});
      });
    });

    it('Defaults a function', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            default: () => 'bar',
          },
        },
      }, db);

      return model.create({}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'bar'});
        assert.deepEqual(doc, {foo: 'bar'});
      });
    });

    it('Doesnt override with default with function', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            default: () => 'bar',
          },
        },
      }, db);

      return model.create({foo: 'baz'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'baz'});
        assert.deepEqual(doc, {foo: 'baz'});
      });
    });

    it('Lowercases a string', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            lowercase: true
          },
        },
      }, db);

      return model.create({foo: 'BAR'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'bar'});
        assert.deepEqual(doc, {foo: 'bar'});
      });
    });

    it('Trims a string', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            trim: true,
            lowercase: true
          },
        },
      }, db);

      return model.create({foo: ' BAR '}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'bar'});
        assert.deepEqual(doc, {foo: 'bar'});
      });
    });

    it('Sets a function', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            set: () => 'baz',
          },
        },
      }, db);

      return model.create({foo: 'bar'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'baz'});
        assert.deepEqual(doc, {foo: 'baz'});
      });
    });

    it('Checks enum', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            enum: ['bar', 'baz'],
          },
        },
      }, db);

      return model.create({foo: 'bar'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'bar'});
        assert.deepEqual(doc, {foo: 'bar'});
      });
    });

    it('Fails enum', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            enum: ['bar', 'baz'],
          },
        },
      }, db);

      return model.create({foo: 'bal'}).catch(error => {
        assert(!db.create.called, 'Should not call db create');
        assert.equal(error, 'Invalid enumerated option in \'foo\'');
      });
    });

    it('Passes sync validation', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            validate: [
              {
                message: 'must pass sync validator',
                validator: (val) => {
                  return true;
                }
              }
            ],
          },
        },
      }, db);

      return model.create({foo: 'bar'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'bar'});
        assert.deepEqual(doc, {foo: 'bar'});
      });
    });

    it('Fails sync validation', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            validate: [
              {
                message: 'must pass sync validator',
                validator: (val) => {
                  return false;
                }
              }
            ],
          },
        },
      }, db);

      return model.create({foo: 'bar'}).catch(error => {
        assert(!db.create.called, 'Should not call db create');
        assert.equal(error, 'must pass sync validator');
      });
    });

    it('Passes async validation', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            validate: [
              {
                isAsync: true,
                message: 'must pass sync validator',
                validator: (val, model, done) => {
                  setTimeout(() => {
                    done(true);
                  }, 1);
                }
              }
            ],
          },
        },
      }, db);

      return model.create({foo: 'bar'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.deepEqual(db.create.args[0][1], {foo: 'bar'});
        assert.deepEqual(doc, {foo: 'bar'});
      });
    });

    it('Fails async validation', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            validate: [
              {
                isAsync: true,
                message: 'must pass sync validator',
                validator: (val, model, done) => {
                  setTimeout(() => {
                    done(false);
                  }, 1);
                }
              }
            ],
          },
        },
      }, db);

      return model.create({foo: 'bar'}).catch(error => {
        assert(!db.create.called, 'Should not call db create');
        assert.equal(error, 'must pass sync validator');
      });
    });
  });
});
