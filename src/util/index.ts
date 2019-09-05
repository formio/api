import * as util from 'formiojs/utils';

export default {
  ...util,
  /**
   * Determine if a value is a boolean representation.
   * @param value
   * @return {boolean}
   */
  isBoolean(value) {
    if (typeof value === 'boolean') {
      return true;
    } else if (typeof value === 'string') {
      value = value.toLowerCase();
      return (value === 'true') || (value === 'false');
    }
    return false;
  },

  /**
   * Quick boolean coercer.
   * @param value
   * @return {boolean}
   */
  boolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return (value.toLowerCase() === 'true');
    }
    return !!value;
  },
};
