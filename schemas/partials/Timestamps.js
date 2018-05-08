'use strict'

module.exports = {
  created: {
    type: Date,
    description: 'The date this resource was created.',
    default: Date.now,
    readonly: true
  },
  modified: {
    type: Date,
    description: 'The date this resource was modified.',
    readonly: true,
    set: () => Date.now()
  }
};
