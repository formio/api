import {lodash as _} from '../../../util/lodash';

module.exports =  (component, data, handler) => {
  if (handler === 'afterActions') {
    _.unset(data, component.key);
  }
  return Promise.resolve();
};
