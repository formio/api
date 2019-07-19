const _get = require('lodash/get');
const _set = require('lodash/set');

module.exports = (component, data, handler, action) => {
  if (action === 'resources.js') {
    const value = _get(data, component.key);
    _set(data, component.key, (!value || (value.length < 25)) ? '' : 'YES');
  }
  return Promise.resolve();
};
