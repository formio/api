const assert = require('chai').assert;
const sinon = require('sinon');

// A fake db wrapper for stubbing.
const app = require('../test/mocks/app');
const model = require('../test/mocks/model');
const sandbox = sinon.createSandbox();

const Resource = require('./Resource');
const ChildResource = require('../test/mocks/childResource');

describe('Resource.js', () => {
  afterEach(() => {
    sandbox.restore();
  });

  describe('Initialization', () => {
    it('Adds routes to app', done => {
      sandbox.spy(app, 'get');
      sandbox.spy(app, 'put');
      sandbox.spy(app, 'post');
      sandbox.spy(app, 'patch');
      sandbox.spy(app, 'delete');
      sandbox.spy(app, 'use');

      const resource = new Resource(model, app);

      assert(app.get.calledTwice, 'Should call get twice');
      assert.equal(app.get.args[0][0], model.name);
      assert.equal(app.get.args[1][0], model.name + '/:' + model.name + 'Id');
      assert(app.put.calledOnce, 'Should call put once');
      assert.equal(app.put.args[0][0], model.name + '/:' + model.name + 'Id');
      assert(app.post.calledOnce, 'Should call post once');
      assert.equal(app.post.args[0][0], model.name);
      assert(app.patch.calledOnce, 'Should call patch once');
      assert.equal(app.patch.args[0][0], model.name + '/:' + model.name + 'Id');
      assert(app.delete.calledOnce, 'Should call delete once');
      assert.equal(app.delete.args[0][0], model.name + '/:' + model.name + 'Id');
      assert(app.use.notCalled, 'Should not call use');

      done();
    });

    it('Adds inherited routes to app', done => {
      sandbox.spy(app, 'get');
      sandbox.spy(app, 'put');
      sandbox.spy(app, 'post');
      sandbox.spy(app, 'patch');
      sandbox.spy(app, 'delete');
      sandbox.spy(app, 'use');

      const resource = new ChildResource(model, app);

      assert(app.get.calledTwice, 'Should call get twice');
      assert.equal(app.get.args[0][0], 'foo/' + model.name);
      assert.equal(app.get.args[1][0], 'foo/' + model.name + '/:' + model.name + 'Id');
      assert(app.put.calledOnce, 'Should call put once');
      assert.equal(app.put.args[0][0], 'foo/' + model.name + '/:' + model.name + 'Id');
      assert(app.post.calledOnce, 'Should call post once');
      assert.equal(app.post.args[0][0], 'foo/' + model.name);
      assert(app.patch.calledOnce, 'Should call patch once');
      assert.equal(app.patch.args[0][0], 'foo/' + model.name + '/:' + model.name + 'Id');
      assert(app.delete.calledOnce, 'Should call delete once');
      assert.equal(app.delete.args[0][0], 'foo/' + model.name + '/:' + model.name + 'Id');
      assert(app.use.calledOnce, 'Should call use once');
      assert.equal(app.use.args[0][0], 'foo/' + model.name + '/test');

      done();
    });
  });

  describe('Handles Index Get', () => {

  });

  describe('Handles Get', done => {
    it('Calls read from get', done => {
      sandbox.spy(model, 'read');

      const resource = new Resource(model, app);

      resource.get({params: {testId: 1}}, {}, err => {
        assert(model.read.calledOnce, 'Should call read');
        assert.deepEqual(model.read.args[0][0], {_id: 1});
        done(err);
      });
    });

    it('Returns an error from get', done => {
      sandbox.stub(model, 'read').rejects('Not found');

      const resource = new Resource(model, app);

      resource.get({params: {testId: 1}}, {}, err => {
        assert(model.read.calledOnce, 'Should call read');
        assert.deepEqual(model.read.args[0][0], {_id: 1});
        assert.equal(err, 'Not found');
        done();
      });
    });
  });

  describe('Handles Post', done => {
    it('Calls read from post', done => {
      sandbox.spy(model, 'create');

      const resource = new Resource(model, app);

      const body = {
        foo: 'bar'
      };

      resource.post({body}, {}, err => {
        assert(model.create.calledOnce, 'Should call create');
        assert.deepEqual(model.create.args[0][0], body);
        done(err);
      });
    });

    it('Returns an error from post', done => {
      sandbox.stub(model, 'create').rejects('Not found');

      const resource = new Resource(model, app);

      const body = {
        foo: 'bar'
      };

      resource.post({body}, {}, err => {
        assert(model.create.calledOnce, 'Should call create');
        assert.deepEqual(model.create.args[0][0], body);
        assert.equal(err, 'Not found');
        done();
      });
    });

    it('Allows overriding function', done => {
      sandbox.spy(ChildResource.prototype, 'before');
      sandbox.spy(ChildResource.prototype, 'post');
      sandbox.spy(ChildResource.prototype, 'after');
      sandbox.spy(Resource.prototype, 'post');

      const resource = new ChildResource(model, app);

      const body = {
        foo: 'bar'
      };

      resource.post({body}, {}, err => {
        sinon.assert.callOrder(ChildResource.prototype.post, ChildResource.prototype.before, Resource.prototype.post, ChildResource.prototype.after);
        done(err);
      });
    });
  });

  describe('Handles Put', done => {

  });

  describe('Handles Patch', done => {

  });

  describe('Handles Delete', done => {

  });
});