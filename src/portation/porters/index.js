const Action = require('./Action');
const ActionItem = require('./ActionItem');
const Form = require('./Form');
const Resource = require('./Resource');
const Role = require('./Role');
const Submission = require('./Submission');

// These are in order or import order.
module.exports = [
  Role,
  Resource,
  Form,
  Action,
  Submission,
  ActionItem,
];
