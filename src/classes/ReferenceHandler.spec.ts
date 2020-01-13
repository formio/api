import {assert, expect} from 'chai';
import * as sinon from 'sinon';

import {Express} from '../../test/mocks/Express';
import {Database} from '../dbs/Database';
import {Api} from '../FormApi';
import {lodash as _} from '../util/lodash';

import { ReferenceHandler } from './ReferenceHandler';

const router: any = new Express();
const db = new Database();
const app = new Api(router, db, {});

const component = {multiple: false};
const path = 'form';
const req = {};

const mockIds = [app.db.toID('id'), app.db.toID('id2'), app.db.toID('id3')];

const mockItems = mockIds.map((id) => ({
  data: {
    [path]: {_id: id},
  },
}));

const res = {
  resource: {
    item: mockItems[0],
    items: mockItems,
  },
};

const multipleComponentRes = {
  resource: {
    item: {
      data: {
        [path]: mockIds.map((_id) => ({_id})),
      },
    },
  },
};

const afterValidateHandler = 'afterValidate';
const afterActionsHandler = 'afterActions';

describe('Reference Handler', () => {
  let instance: ReferenceHandler;

  beforeEach(() => {
    const request = _.cloneDeep(req);
    const response = _.cloneDeep(res);

    instance = new ReferenceHandler(component, path, request, response, app);
  });

  describe('Handles Get', () => {
    const mockIdQuery = {_id: mockIds[0]};

    let getIdQueryStub: sinon.SinonStub;
    let loadReferencesStub: sinon.SinonStub;

    beforeEach(() => {
      getIdQueryStub = sinon.stub(instance, 'getIdQuery' as any);
      loadReferencesStub = sinon.stub(instance, 'loadReferences' as any);
    });

    afterEach(() => {
      getIdQueryStub.restore();
      loadReferencesStub.restore();
    });

    it('Doesn\'t invoke getIdQuery if handler is not afterActions', async () => {
      await instance.onGet('invalidHandler');
      assert(getIdQueryStub.notCalled);
    });

    it('Doesn\'t invoke loadReferences if there is no idQuery', async () => {
      getIdQueryStub.returns(undefined);
      await instance.onGet(afterActionsHandler);

      assert(loadReferencesStub.notCalled);
    });

    describe('Resource value', () => {
      it('Sets correctly if items were found', async () => {
        const mockItem = {_id: mockIds[0], textField: 'test'};

        getIdQueryStub.returns(mockIdQuery);
        loadReferencesStub.resolves([mockItem]);

        await instance.onGet(afterActionsHandler);

        expect((instance as any).res.resource.item.data[path])
          .to.deep.equal(mockItem);
      });

      it('Sets correctly if items were not found', async () => {
        getIdQueryStub.returns(mockIdQuery);
        loadReferencesStub.resolves([]);

        await instance.onGet(afterActionsHandler);

        expect((instance as any).res.resource.item.data[path])
          .to.deep.equal(res.resource.item.data[path]);
      });
    });

    describe('References', () => {
      it('Loads correctly with multiple component', async () => {
        const multipleComponent = _.cloneDeep(component);
        multipleComponent.multiple = true;

        const request = _.cloneDeep(req);
        const response = _.cloneDeep(multipleComponentRes);

        const expectedIds = {$in: mockIds};

        instance = new ReferenceHandler(multipleComponent, path, request, response, app);
        loadReferencesStub = sinon.stub(instance, 'loadReferences' as any);

        await instance.onGet(afterActionsHandler);

        expect(loadReferencesStub.args[0][0]._id).to.eql(expectedIds);

        loadReferencesStub.restore();
      });

      it('Loads correctly with not multiple component', async () => {
        getIdQueryStub.restore();
        await instance.onGet(afterActionsHandler);

        expect(loadReferencesStub.args[0][0]._id)
          .to.eql(res.resource.item.data[path]._id);
      });
    });
  });

  describe('Handles Post and Put', () => {
    let setResourceToRequestStub: sinon.SinonStub;
    let getResourceFromRequest: sinon.SinonStub;

    beforeEach(() => {
      setResourceToRequestStub = sinon.stub(instance, 'setResourceToRequest' as any);
      getResourceFromRequest = sinon.stub(instance, 'getResourceFromRequest' as any);
    });

    afterEach(() => {
      setResourceToRequestStub.restore();
      getResourceFromRequest.restore();
    });

    describe('Handles Post', () => {
      describe('afterValidate', () => {
        it('Sets resource to request', async () => {
          await instance.onPost(afterValidateHandler);

          assert(setResourceToRequestStub.called);
          assert(getResourceFromRequest.notCalled);
        });
      });

      describe('afterActions', () => {
        it('Gets resource from request', async () => {
          await instance.onPost(afterActionsHandler);

          assert(setResourceToRequestStub.notCalled);
          assert(getResourceFromRequest.called);
        });
      });

      describe('Neither afterValidate or afterActions', () => {
        it('Doesn\'t invoke anything', async () => {
          await instance.onPost('test');

          assert(setResourceToRequestStub.notCalled);
          assert(getResourceFromRequest.notCalled);
        });
      });
    });

    describe('Handles Put', () => {
      describe('afterValidate', () => {
        it('Sets resource to request', async () => {
          await instance.onPut(afterValidateHandler);

          assert(setResourceToRequestStub.called);
          assert(getResourceFromRequest.notCalled);
        });
      });

      describe('afterActions', () => {
        it('Gets resource from request', async () => {
          await instance.onPut(afterActionsHandler);

          assert(setResourceToRequestStub.notCalled);
          assert(getResourceFromRequest.called);
        });
      });

      describe('Neither afterValidate or afterActions', () => {
        it('Doesn\'t invoke anything', async () => {
          await instance.onPut('test');

          assert(setResourceToRequestStub.notCalled);
          assert(getResourceFromRequest.notCalled);
        });
      });
    });
  });

  describe('Handles Index', () => {
    let lodashGetStub: sinon.SinonStub;
    let lodashSetStub: sinon.SinonStub;

    beforeEach(() => {
      lodashGetStub = sinon.stub(_, 'get');
      lodashSetStub = sinon.stub(_, 'set');
    });

    afterEach(() => {
      lodashGetStub.restore();
      lodashSetStub.restore();
    });

    it('Doesn\'t get items if handler is not afterActions', async () => {
      await instance.onIndex(afterValidateHandler);
      assert(lodashGetStub.notCalled);
    });

    it('Doesn\'t set items to resource value if they were not found', async () => {
      lodashGetStub.returns(null);
      await instance.onIndex(afterActionsHandler);

      assert(lodashGetStub.called);
      assert(lodashSetStub.notCalled);
    });

    it('Sets items to resource value if they were found', async () => {
      const itemsMock = mockIds.map((_id) => ({
        data: {
          [path]: {
            _id,
            textField: `textField${_id}`,
          },
        },
      }));

      lodashSetStub.restore();
      lodashGetStub.returns(itemsMock);

      const flatItemStub = sinon.stub(instance, 'flatItem' as any).returnsArg(0);

      await instance.onIndex(afterActionsHandler);

      expect((instance as any).res.resource.items).to.eql(itemsMock);

      flatItemStub.restore();
    });
  });
});
