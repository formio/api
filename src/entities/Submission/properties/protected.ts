import {lodash as _} from '../../../util/lodash';

export const protectedAction = (component, data, handler) => {
  if (handler === 'afterActions') {
    _.unset(data, component.key);
  }
  return Promise.resolve();
};
