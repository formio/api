import {assert} from 'chai';
import * as sinon from 'sinon';

import {Express} from '../../test/mocks/Express';
import {Database} from '../dbs/Database';
import {Api} from '../FormApi';
import {Action} from './Action';
import {util} from '../util';

const router: any = new Express();
const db = new Database();
const app = new Api(router, db, {});

const sandbox = sinon.createSandbox();

describe('Action.js', () => {
  afterEach(() => {
    sandbox.restore();
  });

  it('Returns static info', (done) => {
    assert.deepEqual(Object.keys(Action.info()), [
      'name',
      'title',
      'group',
      'description',
      'priority',
      'defaults',
    ]);
    done();
  });

  it('Returns a basic settings form', (done) => {
    const settingsForm = Action.settingsForm({ info: Action.info() }, []);
    const components: any = [];

    util.formio.eachComponent(settingsForm, (component) => {
      if (component.key) {
        components.push(component.key);
      }
    }, true);

    assert.deepEqual(components, [
      'priority',
      'name',
      'title',
      'actionSettings',
      'settings',
      'conditions',
      'handler',
      'method',
      'fieldset',
      'condition',
      'columns',
      'field',
      'eq',
      'value',
      'well2',
      'html',
      'custom',
      'html2',
      'submit',
    ]);

    done();
  });

  it('Instantiates an Action', (done) => {
    const action = new Action(app, {});
    done();
  });
});
