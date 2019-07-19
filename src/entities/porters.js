const Action = require('./Action/Porter');
const ActionItem = require('./ActionItem/Porter');
const Form = require('./Form/Porter');
const Resource = require('./Resource/Porter');
const Role = require('./Role/Porter');
const Submission = require('./Submission/Porter');

// These are in import order.
module.exports = [
  Role,
  Resource,
  Form,
  Action,
  Submission,
  ActionItem,
];
