'use strict';

module.exports = {
  created: {
    type: 'date',
    description: 'The date this resource was created.',
    default: Date.now,
    readonly: true
  },
  modified: {
    type: 'date',
    description: 'The date this resource was modified.',
    readonly: true,
    set: () => Date.now()
  }
};
