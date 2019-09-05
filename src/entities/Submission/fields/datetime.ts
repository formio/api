const _get = require('lodash/get');
const _set = require('lodash/set');

module.exports = (component, data, handler, action) => {
  if (['put', 'post', 'patch'].includes(action) && ['afterValidation'].includes(handler)) {
    const value = _get(data, component.key);
    if (value) {
      _set(data, component.key, new Date(value));
    }
  }
  return Promise.resolve();
};
