import {lodash as _} from '../../../util/lodash';

export const signature = (component, data, handler, action) => {
  if (action === 'resources.js') {
    const value = _.get(data, component.key);
    _.set(data, component.key, (!value || (value.length < 25)) ? '' : 'YES');
  }
  return Promise.resolve();
};
