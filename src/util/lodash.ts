import camelCase from 'lodash/camelCase';
import capitalize from 'lodash/capitalize';
import chunk from 'lodash/chunk';
import find from 'lodash/find';
import get from 'lodash/get';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';
import omit from 'lodash/omit';
import set from 'lodash/set';
import unset from 'lodash/unset';
import update from 'lodash/update';

/**
 * This is a wrapper around lodash functions. It allows us to optimize builds and not import all of lodash.
 */
export const lodash = {
  camelCase,
  capitalize,
  chunk,
  find,
  get,
  set,
  has,
  unset,
  update,
  isEqual,
  isEmpty,
  isNumber,
  omit,
  isObject: (value) => {
    const type = typeof value;
    return value != null && (type === 'object' || type === 'function');
  },
  isString,
  isUndefined: (value) => {
    return value === undefined;
  },
  isNull: (value) => {
    return value === null;
  },
  uniq: (items) => {
    return items.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
  },
  clone: (obj) => ({...obj}),
  cloneDeep: (obj) => {
    // TODO: What should we use for cloneDeep? lodash is slow but has some features over json.
    return JSON.parse(JSON.stringify(obj));
  },
  // DO NOT ADD ANY ITEMS THAT CAN BE REPLACED WITH ES6.
  // https://www.sitepoint.com/lodash-features-replace-es6/
};

/**
 * Items NOT to be included:
 *
 * each
 * map
 * filter
 * reduce
 * eq
 * spread
 * includes
 * isArray
 */
