import {assert} from 'chai';
import * as sinon from 'sinon';

import {Child} from '../../test/mocks/childResource';
import {Express} from '../../test/mocks/Express';
import {TestSchema} from '../../test/mocks/TestSchema';
import {Database} from '../dbs/Database';
import {Model} from '../dbs/Model';
import {Api} from '../FormApi';
import {Resource} from './Resource';

const router: any = new Express();
const db = new Database();
const app = new Api(router, db, {});
const model: any = new Model(new TestSchema(app), db);

const sandbox = sinon.createSandbox();

describe('Resource.js', () => {
  afterEach(() => {
    sandbox.restore();
  });

  describe('Initialization', () => {
    it('Adds routes to router', (done) => {
      sandbox.spy(router, 'get');
      sandbox.spy(router, 'put');
      sandbox.spy(router, 'post');
      sandbox.spy(router, 'patch');
      sandbox.spy(router, 'delete');
      sandbox.spy(router, 'use');

      const resource = new Resource(model, router, app);

      assert(router.get.calledTwice, 'Should call get twice');
      assert.equal(router.get.args[0][0], `/${  model.name}`);
      assert.equal(router.get.args[1][0], `/${  model.name  }/:${  model.name  }Id`);
      assert(router.put.calledOnce, 'Should call put once');
      assert.equal(router.put.args[0][0], `/${  model.name  }/:${  model.name  }Id`);
      assert(router.post.calledOnce, 'Should call post once');
      assert.equal(router.post.args[0][0], `/${  model.name}`);
      assert(router.patch.calledOnce, 'Should call patch once');
      assert.equal(router.patch.args[0][0], `/${  model.name  }/:${  model.name  }Id`);
      assert(router.delete.calledOnce, 'Should call delete once');
      assert.equal(router.delete.args[0][0], `/${  model.name  }/:${  model.name  }Id`);
      assert(router.use.calledOnce, 'Should call use once');
      assert.equal(router.use.args[0][0], `/${  model.name  }/exists`);

      done();
    });

    it('Adds inherited routes to router', (done) => {
      sandbox.spy(router, 'get');
      sandbox.spy(router, 'put');
      sandbox.spy(router, 'post');
      sandbox.spy(router, 'patch');
      sandbox.spy(router, 'delete');
      sandbox.spy(router, 'use');

      const resource = new Child(model, router, app);

      assert(router.get.calledTwice, 'Should call get twice');
      assert.equal(router.get.args[0][0], `/foo/${  model.name}`);
      assert.equal(router.get.args[1][0], `/foo/${  model.name  }/:${  model.name  }Id`);
      assert(router.put.calledOnce, 'Should call put once');
      assert.equal(router.put.args[0][0], `/foo/${  model.name  }/:${  model.name  }Id`);
      assert(router.post.calledOnce, 'Should call post once');
      assert.equal(router.post.args[0][0], `/foo/${  model.name}`);
      assert(router.patch.calledOnce, 'Should call patch once');
      assert.equal(router.patch.args[0][0], `/foo/${  model.name  }/:${  model.name  }Id`);
      assert(router.delete.calledOnce, 'Should call delete once');
      assert.equal(router.delete.args[0][0], `/foo/${  model.name  }/:${  model.name  }Id`);
      assert(router.use.calledTwice, 'Should call use once');
      assert.equal(router.use.args[0][0], `/foo/${  model.name  }/exists`);
      assert.equal(router.use.args[1][0], `/foo/${  model.name  }/test`);

      done();
    });
  });

  describe('Handles Index Get', () => {
    it('Calls find from index', (done) => {
      sandbox.spy(model, 'find');

      const resource = new Resource(model, router, app);

      resource.index({
        context: {
          params: { testId: '1' },
        },
        query: {
          'data.name': 'joe',
          'data.age__gt': 20,
          'sort': 'created',
        },
      }, {}, (err) => {
        assert(model.find.calledOnce, 'Should call index');
        assert.deepEqual(model.find.args[0][0], {
          'data.name': 'joe',
          'data.age': {
            $gt: 20,
          },
        });
        assert.deepEqual(model.find.args[0][1], {
          sort: {
            created: 1,
          },
        });
        done();
      });
    });
  });

  describe('Handles Get', () => {
    it('Calls read from get', (done) => {
      sandbox.spy(model, 'read');

      const resource = new Resource(model, router, app);

      resource.get({ context: { params: { testId: '1' } } }, {}, (err) => {
        assert(model.read.calledOnce, 'Should call read');
        assert.deepEqual(model.read.args[0][0], { _id: '1' });
        done(err);
      });
    });

    it('Returns an error from get', (done) => {
      sandbox.stub(model, 'read').rejects('Not found');

      const resource = new Resource(model, router, app);

      resource.get({ context: { params: { testId: '1' } } }, {}, (err) => {
        assert(model.read.calledOnce, 'Should call read');
        assert.deepEqual(model.read.args[0][0], { _id: '1' });
        assert.equal(err, 'Not found');
        done();
      });
    });
  });

  describe('Handles Post', () => {
    it('Calls read from post', (done) => {
      sandbox.spy(model, 'create');

      const resource = new Resource(model, router, app);

      const body = {
        foo: 'bar',
      };

      resource.post({ body, context: { params: { testId: '1' } } }, {}, (err) => {
        assert(model.create.calledOnce, 'Should call create');
        assert.deepEqual(model.create.args[0][0], body);
        done();
      });
    });

    it('Returns an error from post', (done) => {
      sandbox.stub(model, 'create').rejects('Not found');

      const resource = new Resource(model, router, app);

      const body = {
        foo: 'bar',
      };

      resource.post({ body, context: { params: { testId: 1 } } }, {}, (err) => {
        assert(model.create.calledOnce, 'Should call create');
        assert.deepEqual(model.create.args[0][0], body);
        assert.equal(err, 'Not found');
        done();
      });
    });

    it('Allows overriding function', (done) => {
      sandbox.spy(Child.prototype, 'before');
      sandbox.spy(Child.prototype, 'post');
      sandbox.spy(Child.prototype, 'after');
      sandbox.spy(Resource.prototype, 'post');

      const resource = new Child(model, router, app);

      const body = {
        foo: 'bar',
      };

      resource.post({ body, context: { params: { testId: '1' } } }, {}, (err) => {
        sinon.assert.callOrder(
          Child.prototype.post as sinon.SinonSpy,
          Child.prototype.before as sinon.SinonSpy,
          Resource.prototype.post as sinon.SinonSpy,
          Child.prototype.after as sinon.SinonSpy,
        );
        done(err);
      });
    });
  });

  describe('Handles Put', () => {
    it('Calls update', (done) => {
      sandbox.spy(model, 'update');

      const resource = new Resource(model, router, app);

      resource.put({ context: { params: { testId: '1' } }, body: { baz: 'bur' } }, {}, (err) => {
        assert(model.update.calledOnce, 'Should call update');
        assert.deepEqual(model.update.args[0][0], { baz: 'bur', _id: '1' });
        done();
      });
    });

    it('Returns an error from put', (done) => {
      sandbox.stub(model, 'update').rejects('Not found');

      const resource = new Resource(model, router, app);

      resource.put({ context: { params: { testId: '1' } }, body: { baz: 'bur' } }, {}, (err) => {
        assert(model.update.calledOnce, 'Should call update');
        assert.equal(err, 'Not found');
        done();
      });
    });
  });

  describe('Handles Patch', () => {
    it('Calls patch', (done) => {
      sandbox.stub(model, 'read').resolves({ foo: 'bar', fiz: 'buz', _id: '1' });
      sandbox.spy(model, 'update');

      const resource = new Resource(model, router, app);

      resource.patch({
        context: {
          params: {
            testId: '1',
          },
        },
        body: [
          {
            op: 'add',
            path: '/bing',
            value: 'bong',
          },
          {
            op: 'remove',
            path: '/fiz',
          },
        ] }, {}, () => {
        assert(model.update.calledOnce, 'Should call patch');
        assert.deepEqual(model.update.args[0][0], { foo: 'bar', bing: 'bong', _id: '1' });
        done();
      });
    });

    it('Returns an error from patch', (done) => {
      sandbox.stub(model, 'read').rejects('Not found');

      const resource = new Resource(model, router, app);

      resource.patch({
        context: {
          params: {
            testId: '1',
          },
        },
        body: [
          {
            op: 'add',
            path: '/bing',
            value: 'bong',
          },
          {
            op: 'remove',
            path: '/fiz',
          },
        ] }, {}, (err) => {
        assert(model.read.calledOnce, 'Should call read');
        assert.deepEqual(model.read.args[0][0], {_id: '1'});
        assert.equal(err, 'Not found');
        done();
      });
    });
  });

  describe('Handles Delete', () => {
    it('Calls delete', (done) => {
      sandbox.spy(model, 'delete');

      const resource = new Resource(model, router, app);

      resource.delete({ context: { params: { testId: '1' } } }, {}, (err) => {
        assert(model.delete.calledOnce, 'Should call delete');
        assert.deepEqual(model.delete.args[0][0], {_id: '1'});
        done(err);
      });
    });

    it('Returns an error from delete', (done) => {
      sandbox.stub(model, 'delete').rejects('Not found');

      const resource = new Resource(model, router, app);

      resource.delete({ context: { params: { testId: '1' } } }, {}, (err) => {
        assert(model.delete.calledOnce, 'Should call delete');
        assert.deepEqual(model.delete.args[0][0], {_id: '1'});
        assert.equal(err, 'Not found');
        done();
      });
    });
  });
});
