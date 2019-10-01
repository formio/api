import get from 'lodash/get';
import set from 'lodash/set';
import has from 'lodash/has';
import unset from 'lodash/unset';
import isEqual from 'lodash/isEqual';

/**
 * This is a wrapper around lodash functions. It allows us to optimize builds and not import all of lodash.
 */
export default {
  get,
  set,
  has,
  unset,
  isEqual,
  // DO NOT ADD ANY ITEMS THAT CAN BE REPLACED WITH ES6.
  // https://www.sitepoint.com/lodash-features-replace-es6/
}

/**
 * Items NOT to be included:
 *
 * each
 * map
 * filter
 * reduce
 * eq
 * spread
 * cloneDeep - This is actually slower than JSON.parse(JSON.stringify(obj)).
 */
