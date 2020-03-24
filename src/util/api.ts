import {lodash as _} from './lodash';

/**
 * Determine if a value is a boolean representation.
 * @param value
 * @return {boolean}
 */
export const isBoolean = (value) => {
  if (typeof value === 'boolean') {
    return true;
  } else if (typeof value === 'string') {
    value = value.toLowerCase();
    return (value === 'true') || (value === 'false');
  }
  return false;
};

/**
 * Quick boolean coercer.
 * @param value
 * @return {boolean}
 */
export const getBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return (value.toLowerCase() === 'true');
  }
  return !!value;
};

export const eachValue = (components, data, fn, context, path = '') => {
  const promises = [];

  components.forEach((component) => {
    if (component.hasOwnProperty('components') && Array.isArray(component.components)) {
      // If tree type is an array of objects like datagrid and editgrid.
      if (['datagrid', 'editgrid'].includes(component.type) || component.arrayTree) {
        _.get(data, component.key, []).forEach((row, index) => {
          promises.push(eachValue(
            component.components,
            row,
            fn,
            context,
            (path ? `${path}.` : '') + `${component.key}[${index}]`,
          ));
        });
      } else if (['form'].includes(component.type) && _.has(data, `${component.key}.data`)) {
        promises.push(eachValue(
          component.components,
          _.get(data, `${component.key}.data`, {}),
          fn,
          context,
          (path ? `${path}.` : '') + `${component.key}.data`,
        ));
      } else if (
        ['container'].includes(component.type) ||
        (
          component.tree &&
          !['panel', 'table', 'well', 'columns', 'fieldset', 'tabs', 'form'].includes(component.type)
        )
      ) {
        promises.push(eachValue(
          component.components,
          _.get(data, component.key),
          fn,
          context,
          (path ? `${path}.` : '') + `${component.key}`,
        ));
      } else {
        promises.push(eachValue(component.components, data, fn, context, path));
      }
    } else if (component.hasOwnProperty('columns') && Array.isArray(component.columns)) {
      // Handle column like layout components.
      component.columns.forEach((column) => {
        promises.push(eachValue(column.components, data, fn, context, path));
      });
    } else if (component.hasOwnProperty('rows') && Array.isArray(component.rows)) {
      // Handle table like layout components.
      component.rows.forEach((row) => {
        if (Array.isArray(row)) {
          row.forEach((column) => {
            promises.push(eachValue(column.components, data, fn, context, path));
          });
        }
      });
    }
    // Call the callback for each component.
    promises.push(fn({ ...context, data, component, path }));
  });

  return Promise.all(promises);
};
