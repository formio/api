import * as camelCase from 'lodash/camelCase';
import * as capitalize from 'lodash/capitalize';
import * as chunk from 'lodash/chunk';
import * as find from 'lodash/find';
import * as get from 'lodash/get';
import * as has from 'lodash/has';
import * as isEmpty from 'lodash/isEmpty';
import * as isEqual from 'lodash/isEqual';
import * as isNumber from 'lodash/isNumber';
import * as isString from 'lodash/isString';
import * as omit from 'lodash/omit';
import * as set from 'lodash/set';
import * as unset from 'lodash/unset';
import * as update from 'lodash/update';

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
