const _ = require('lodash');

module.exports =  (component, data, handler, action) => {
  if (handler === 'afterActions') {
    _.unset(data, component.key);
  }
  return Promise.resolve();
};
