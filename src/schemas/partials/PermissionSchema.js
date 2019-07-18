'use strict';

// Define the available permissions for a form.
const available = [
  'create_all',
  'read_all',
  'update_all',
  'delete_all',
  'create_own',
  'read_own',
  'update_own',
  'delete_own',
  'self'
];

// Defines the permissions schema for form permissions.
module.exports = {
  type: {
    type: 'string',
    enum: available,
    required: 'A permission type is required to associate an available permission with a given role.'
  },
  roles: {
    type: 'id',
    ref: 'role'
  }
};
