module.exports = (component, data, handler, action) => {
  if (action === 'index') {
    const value = _.get(data, component.key);
    _.set(data, component.key, (!value || (value.length < 25)) ? '' : 'YES');
  }
  return Promise.resolve();
}
