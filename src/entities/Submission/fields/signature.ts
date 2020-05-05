import {lodash as _} from '../../../util/lodash';

export const signature = (component, data, handler, action, { req, path }) => {
  if (action === 'index') {
    const value = _.get(data, component.key);
    _.set(data, component.key, (!value || (value.length < 25)) ? '' : 'YES');
  }

  if (['beforeValidate'].includes(handler) && ['put', 'patch', 'post'].includes(action)) {
    const value = _.get(data, component.key);
    if (!value && value !== '') {
      _.set(data, component.key, '');
    }
  }

  if (['beforeValidate'].includes(handler) && ['put', 'patch'].includes(action)) {
    const value = _.get(data, component.key);
    if (
      (typeof value !== 'string') ||
      ((value !== '') && (value.substr(0, 5) !== 'data:'))
    ) {
      const oldData = (path === '') ?
        req.context.resources.submission.data :
        _.get(req.context.resources.submission.data, path);
      _.set(data, component.key, oldData);
    }
  }

  return Promise.resolve();
};
