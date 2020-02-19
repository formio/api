import {Database, Model} from '../../../dbs';
import {Api} from '../../../FormApi';
import {lodash as _} from '../../../util/lodash';

/* tslint:disable-next-line interface-name */
export interface ReferenceHandlerParams {
  app: Api;
  component?: any;
  path: string;
  req?: any;
  res: any;
}

const hiddenFields = ['deleted', '__v', 'machineName'];

const loadReferences = async (model: Model, query: any) => {
  const references = await model.find(query);
  return references;
};

const getIdQuery = (db: Database, component: any, compValue: any) => {
  let idQuery: any;

  if (component.multiple && Array.isArray(compValue)) {
    idQuery = {$in: []};
    compValue.map((value) => idQuery.$in.push(db.toID(value._id)));
  } else if (compValue._id) {
    idQuery = db.toID(compValue._id);
  }

  return idQuery;
};

const setResourceToRequest = (db: Database, req: any, path: string) => {
  const compValue = _.get(req.body.data, path);

  if (compValue && compValue._id) {
    if (!req.resources) {
      req.resources = {};
    }

    // Save for later.
    req.resources[compValue._id.toString()] = _.omit(compValue, hiddenFields);

    // Ensure we only set the _id of the resource.
    _.set(req.body.data, path, {
      _id: db.toID(compValue._id),
    });
  }
};

const getResourceFromRequest = (req: any, res: any, path: string) => {
  const resource = _.get(res, 'resource.item');
  const resourceValue = _.get(resource, `data.${path}`);

  if (!resource) {
    return;
  }

  // Make sure to reset the value on the return result.
  const compValue = resourceValue;
  if (!compValue || !compValue._id) {
    return;
  }

  const compValueId = compValue._id.toString();
  if (compValue && req.resources && req.resources.hasOwnProperty(compValueId)) {
    _.set(resource, `data.${path}`, req.resources[compValueId]);
  }
};

const flatItem = async (
  db: Database,
  model: Model,
  component: any,
  item: any,
  path: string,
): Promise<any> => {
  if (!item.data[path]) {
    return null;
  }

  const idQuery = getIdQuery(db, component, item.data[path]);
  if (!idQuery) {
    return null;
  }

  const items = await loadReferences(model, {
    _id: idQuery,
    deleted: {$eq: null},
  });

  if (items && items.length > 0) {
    item.data[path] = component.multiple ? items : items[0];
    return item;
  }

  return null;
};

const onGet = async (
  {app, component, path, res}: ReferenceHandlerParams,
  handler: string,
): Promise<void> => {
  const resource = _.get(res, 'resource.item');
  const resourceValue = _.get(resource, `data.${path}`);

  if (handler !== 'afterActions' || !resource || !resourceValue) {
    return;
  }

  const idQuery = getIdQuery(app.db, component, resourceValue);
  if (!idQuery) {
    return;
  }

  const items = await loadReferences(app.models.Submission, {
    _id: idQuery,
    deleted: {$eq: null},
  });

  let newValue: any;

  if (items && items.length > 0) {
    newValue = component.multiple ? items : items[0];
    _.set(resource, `data.${path}`, newValue);
    return;
  }

  newValue = component.multiple
    ? resourceValue.map(({_id}) => ({_id}))
    : {_id: resourceValue._id};
  _.set(resource, `data.${path}`, newValue);

  return;
};

const onCreateOrUpdate = async (
  {app, path, req, res}: ReferenceHandlerParams,
  handler: string,
): Promise<void> => {
  if (handler === 'afterValidate') {
    return setResourceToRequest(app.db, req, path);
  } else if (handler === 'afterActions') {
    return getResourceFromRequest(req, res, path);
  }

  return;
};

const onIndex = async (
  {app, component, path, res}: ReferenceHandlerParams,
  handler: string,
): Promise<void> => {
  if (handler !== 'afterActions') {
    return;
  }

  const items = _.get(res, 'resource.items');
  if (!items) {
    return;
  }

  const flattenItems = await Promise.all(items.map((item: any) => flatItem(
    app.db,
    app.models.Submission,
    component,
    item,
    path,
  )));

  _.set(res, 'resource.items', flattenItems.filter((item) => !!item));

  return;
};

export const ReferenceHandler = {
  onGet,
  onPost: onCreateOrUpdate,
  onPut: onCreateOrUpdate,
  onIndex,
};
