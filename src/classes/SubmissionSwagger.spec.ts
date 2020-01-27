import {expect} from 'chai';
import * as sinon from 'sinon';

import {Express} from '../../test/mocks/Express';
import {Database} from '../dbs/Database';
import {Api} from '../FormApi';
import {lodash as _} from '../util/lodash';

import {SubmissionSwagger} from './SubmissionSwagger';

const router: any = new Express();
const db = new Database();
const app = new Api(router, db, {});

const actionModel = app.models.Action;

const name = 'test';
const submissionName = `${name}Submission`;
const submissionDataName = `${submissionName}Data`;
const methods = ['index', 'post', 'get', 'put', 'patch', 'delete'];
const baseRoute = '/base/:baseId/resource';

const form = {
  components: [
    {
      type: 'checkbox',
      input: true,
      key: 'checkbox1',
      multiple: false,
    },
    {
      type: 'textfield',
      input: true,
      key: 'textfield1',
      multiple: true,
    },
  ],
};

describe('SubmissionSwagger', () => {
  let swagger = new SubmissionSwagger(baseRoute, name, methods, actionModel, form);

  it('Should add data to schema', () => {
    const json = swagger.getJson();

    const reference = {
      $ref: `#/components/schemas/${submissionDataName}`,
    };

    expect(json.components.schemas[submissionName].required).include('data');
    expect(json.components.schemas[submissionName].properties.data).eql(reference);
  });

  it('Iterates over each component in form', () => {
    const getComponentPropertySpy = sinon.spy((swagger as any), 'getComponentProperty');
    const firstCallArgs = [form.components[0].type, {multiple: form.components[0].multiple}];
    const secondCallArgs = [form.components[1].type, {multiple: form.components[1].multiple}];

    swagger.getJson();

    expect(getComponentPropertySpy.callCount).equal(form.components.length);
    expect(getComponentPropertySpy.getCall(0).args).eql(firstCallArgs);
    expect(getComponentPropertySpy.getCall(1).args).eql(secondCallArgs);

    getComponentPropertySpy.restore();
  });

  describe('Submission Schema', () => {
    it('Deletes required field if it is empty', () => {
      const json = swagger.getJson();

      /* tslint:disable-next-line no-unused-expression */
      expect(json.components.schemas[submissionDataName].required).to.be.undefined;
    });

    it('Adds required fields', () => {
      const formWithRequired = _.cloneDeep(form);
      formWithRequired.components[0].validate = {required: true};

      swagger = new SubmissionSwagger(baseRoute, name, methods, actionModel, formWithRequired);
      const json = swagger.getJson();

      expect(json.components.schemas[submissionDataName].required).eql(['checkbox1']);
    });

    it('Handles multiple component', () => {
      const json = swagger.getJson();
      const defaultKey = form.components[0].key;
      const multipleKey = form.components[1].key;

      expect(json.components.schemas[submissionDataName].properties[defaultKey].type).not.equal('array');
      expect(json.components.schemas[submissionDataName].properties[multipleKey].type).equal('array');
    });

    // TODO: Add schema types tests
  });
});
