import {assert, expect} from 'chai';
import * as sinon from 'sinon';

import {lodash as _} from '../util/lodash';
import { ReferenceHandler } from './ReferenceHandler';

import {Express} from '../../test/mocks/Express';
import {Database} from '../dbs/Database';
import {Api} from '../FormApi';

const router: any = new Express();
const db = new Database();
const app = new Api(router, db, {});

const component = {multiple: false};
const path = 'form';
const req = {};

const mockId = app.db.toID('id');
const mockAnotherId = app.db.toID('id2');

const res = {
  resource: {
    item: {
      data: {
        [path]: {
          _id: mockId,
        },
      },
    },
    items: [
      {
        data: {
          [path]: {
            _id: mockId,
          },
        },
      },
      {
        data: {
          [path]: {
            _id: mockAnotherId,
          },
        },
      },
    ],
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
    const mockIdQuery = {_id: mockId};

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

    it('Sets the first item to resource value if items were found', async () => {
      const mockItem = {_id: mockId, textField: 'test'};

      getIdQueryStub.returns(mockIdQuery);
      loadReferencesStub.resolves([mockItem]);

      await instance.onGet(afterActionsHandler);

      expect((instance as any).res.resource.item.data[path])
        .to.deep.equal(mockItem);
    });

    it('Sets resource value as it was if items were not found', async () => {
      getIdQueryStub.returns(mockIdQuery);
      loadReferencesStub.resolves([]);

      await instance.onGet(afterActionsHandler);

      expect((instance as any).res.resource.item.data[path])
        .to.deep.equal(res.resource.item.data[path]);
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
      it('Sets resource to request if handler is afterValidate', async () => {
        await instance.onPost(afterValidateHandler);

        assert(setResourceToRequestStub.called);
        assert(getResourceFromRequest.notCalled);
      });

      it('Gets resource from request if handler is afterActions', async () => {
        await instance.onPost(afterActionsHandler);

        assert(setResourceToRequestStub.notCalled);
        assert(getResourceFromRequest.called);
      });

      it('Doesn\'t invoke anything if handler is not afterValidate or afterActions', async () => {
        await instance.onPost('test');

        assert(setResourceToRequestStub.notCalled);
        assert(getResourceFromRequest.notCalled);
      });
    });

    describe('Handles Put', () => {
      it('Sets resource to request if handler is afterValidate', async () => {
        await instance.onPut(afterValidateHandler);

        assert(setResourceToRequestStub.called);
        assert(getResourceFromRequest.notCalled);
      });

      it('Gets resource from request if handler is afterActions', async () => {
        await instance.onPut(afterActionsHandler);

        assert(setResourceToRequestStub.notCalled);
        assert(getResourceFromRequest.called);
      });

      it('Doesn\'t invoke anything if handler is not afterValidate or afterActions', async () => {
        await instance.onPut('test');

        assert(setResourceToRequestStub.notCalled);
        assert(getResourceFromRequest.notCalled);
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

    it('Doesn\'t set items to resource value if items were not found', async () => {
      lodashGetStub.returns(null);
      await instance.onIndex(afterActionsHandler);

      assert(lodashGetStub.called);
      assert(lodashSetStub.notCalled);
    });

    it('Sets items to resource value if they were found', async () => {
      const itemsMock = [
        {
          data: {
            [path]: {
              _id: mockId,
              textField: 'textField1',
            },
          },
        },
        {
          data: {
            [path]: {
              _id: mockAnotherId,
              textField: 'textField2',
            },
          },
        },
      ];

      lodashSetStub.restore();
      lodashGetStub.returns(itemsMock);

      const flatItemStub = sinon.stub(instance, 'flatItem' as any).returnsArg(0);

      await instance.onIndex(afterActionsHandler);

      const items = (instance as any).res.resource.items;

      expect(items.length).to.equal(2);
      expect(items).to.deep.include(itemsMock[0]);
      expect(items).to.deep.include(itemsMock[1]);

      flatItemStub.restore();
    });
  });
});
