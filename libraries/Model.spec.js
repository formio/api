const assert = require('chai').assert;
const sinon = require('sinon');

// A fake db wrapper for stubbing.
const db = require('../test/mocks/db');
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
        assert(db.createCollection.notCalled, 'Should not call createCollection');
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

    it('Provides a way to transform IDs', done => {
      sandbox.spy(db, 'ID');

      const model = new Model({
        name: 'test',
        schema: {}
      }, db);

      const result = model.toID('test');
      assert(db.ID.calledOnce, 'Should call db id');
      assert.deepEqual(result, {id: 'test'});
      done();
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
        assert.isString(db.create.args[0][1].foo);
        assert.isString(doc.foo);
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

    it('Converts to number', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'number'
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

    it('Nests object types', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: {
              bar: {
                type: 'string'
              }
            }
          },
        },
      }, db);

      return model.create({
        foo: { bar: 3}
      }).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.equal(db.create.args[0][1].foo.bar, '3');
        assert.isString(db.create.args[0][1].foo.bar);
        assert.equal(doc.foo.bar, '3');
        assert.isString(doc.foo.bar);
      });
    });

    it('Nests array object types', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: [{
              bar: {
                type: 'string'
              }
            }]
          },
        },
      }, db);

      return model.create({
        foo: [{ bar: 3}, {bar: 4}]
      }).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.equal(db.create.args[0][1].foo[0].bar, '3');
        assert.isString(db.create.args[0][1].foo[0].bar);
        assert.equal(db.create.args[0][1].foo[1].bar, '4');
        assert.isString(db.create.args[0][1].foo[1].bar);
        assert.equal(doc.foo[0].bar, '3');
        assert.isString(doc.foo[0].bar);
        assert.equal(doc.foo[1].bar, '4');
        assert.isString(doc.foo[1].bar);
      });
    });

    it('Nests array types', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: ['string']
          },
        },
      }, db);

      return model.create({
        foo: [3, 4]
      }).then(doc => {
        assert(db.create.calledOnce, 'Should call db create');
        assert.isString(db.create.args[0][1].foo[0]);
        assert.isString(db.create.args[0][1].foo[1]);
        assert.equal(db.create.args[0][1].foo[0], '3');
        assert.equal(db.create.args[0][1].foo[1], '4');
        assert.isString(doc.foo[0]);
        assert.isString(doc.foo[1]);
        assert.equal(doc.foo[0], '3');
        assert.equal(doc.foo[1], '4');
      });
    });
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
        assert(db.create.notCalled, 'Should not call db create');
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
        assert(db.create.notCalled, 'Should not call db create');
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
        assert(db.create.notCalled, 'Should not call db create');
        assert.equal(error, 'must pass sync validator');
      });
    });

    it('Allows write on read only', () => {
      sandbox.spy(db, 'create');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            readOnly: true
          },
        },
      }, db);

      return model.create({_id: '3', foo: 'baz'}).then(doc => {
        assert(db.create.calledOnce, 'Should call db update');
        assert.equal(db.create.args[0][1].foo, 'baz');
        assert.equal(doc.foo, 'baz');
      });
    })

  });

  describe('Read Tests', () => {
    it('Reads an existing record', () => {
      sandbox.stub(db, 'read').resolves({_id: 'foo', bar: 'baz'});

      const model = new Model({
        name: 'test',
        schema: {
          bar: {
            type: 'string',
          },
        },
      }, db);

      return model.read({_id: 'foo'}).then(doc => {
        assert(db.read.calledOnce, 'Should call read');
        assert.deepEqual(db.read.args[0][1], {_id: 'foo'});
        assert.deepEqual(doc, {_id: 'foo', bar: 'baz'});
      });
    });

    it('Converts ids to strings', () => {
      sandbox.stub(db, 'read').resolves({_id: 3, bar: 'baz'});

      const model = new Model({
        name: 'test',
        schema: {
          bar: {
            type: 'string',
          },
        },
      }, db);

      return model.read({_id: 3}).then(doc => {
        assert.isString(doc._id);
        assert.deepEqual(doc, {_id: '3', bar: 'baz'});
      });
    });

    it('Returns read errors', () => {
      sandbox.stub(db, 'read').rejects('Could not find entry');

      const model = new Model({
        name: 'test',
        schema: {
          bar: {
            type: 'string',
          },
        },
      }, db);

      return model.read(3).catch(error => {
        assert.equal(error, 'Could not find entry');
      });
    });
  });

  describe('Update Tests', () => {
    it('Updates a record', () => {
      sandbox.stub(db, 'read').resolves({_id: 3, foo: 'bar'});
      sandbox.spy(db, 'update');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string'
          },
        },
      }, db);

      return model.update({_id: '3', foo: 'baz'}).then(doc => {
        assert(db.update.calledOnce, 'Should call db update');
        assert.equal(db.update.args[0][1].foo, 'baz');
        assert.equal(doc.foo, 'baz');
      });
    });

    it('Enforces read only', () => {
      sandbox.stub(db, 'read').resolves({_id: 3, foo: 'bar'});
      sandbox.spy(db, 'update');

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
            readOnly: true
          },
        },
      }, db);

      return model.update({_id: '3', foo: 'baz'}).then(doc => {
        assert(db.update.calledOnce, 'Should call db update');
        assert.equal(db.update.args[0][1].foo, 'bar');
        assert.equal(doc.foo, 'bar');
      });
    })
  });

  describe('Delete Tests', () => {
    it('Deletes an existing record', () => {
      sandbox.spy(db, 'delete');

      const model = new Model({
        name: 'test',
        schema: {
          bar: {
            type: 'string',
          },
        },
      }, db);

      return model.delete('foo').then(doc => {
        assert(db.delete.calledOnce, 'Should call delete');
        assert.deepEqual(db.delete.args[0][1], 'foo');
      });
    });

    it('Returns delete errors', () => {
      sandbox.stub(db, 'delete').rejects('Could not delete entry');

      const model = new Model({
        name: 'test',
        schema: {
          bar: {
            type: 'string',
          },
        },
      }, db);

      return model.delete('foo').catch(error => {
        assert.equal(error, 'Could not delete entry');
      });
    });
  });

  describe('Count Tests', () => {
    it('Counts records', () => {
      sandbox.stub(db, 'count').resolves(4);

      const model = new Model({
        name: 'test',
        schema: {
          bar: {
            type: 'string',
          },
        },
      }, db);

      const query = {foo: 'bar'};
      return model.count(query).then(result => {
        assert(db.count.calledOnce, 'Should call count');
        assert.deepEqual(db.count.args[0][1], query);
        assert.equal(result, 4);
      });
    });
  });

  describe('Find Tests', () => {
    it('Finds results', () => {
      sandbox.stub(db, 'find').resolves([{_id: 1, foo: 'bar'}, {_id: 2, foo: 'bar'}, {_id: 3, foo: 'bar'}]);

      const model = new Model({
        name: 'test',
        schema: {
          foo: {
            type: 'string',
          },
        },
      }, db);

      const query = {foo: 'bar'};
      const options = {sort: 1, limit: 10};
      return model.find(query, options).then(result => {
        assert(db.find.calledOnce, 'Should call find');
        assert.deepEqual(db.find.args[0][1], query);
        assert.deepEqual(db.find.args[0][2], options);
        assert.equal(result.length, 3);
        assert.isString(result[0]._id);
        assert.isString(result[1]._id);
        assert.isString(result[2]._id);
      });
    });
  });
});
