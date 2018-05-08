'use strict';

// Define the available permissions for a submission.
const available = [
  'read',
  'write',
  'admin'
];

module.exports = {
  _id: false,
  type: {
    type: String,
    enum: available,
    required: 'A permission type is required to associate an available permission with a Resource.'
  },
  resources: {
    type: 'id',
    ref: 'form'
  }
};
