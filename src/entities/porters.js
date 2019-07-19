const Action = require('../../entities/Porter/Action');
const ActionItem = require('../../entities/Porter/ActionItem');
const Form = require('../../entities/Porter/Form');
const Resource = require('../../entities/Resource/Resource');
const Role = require('./Role/schema');
const Submission = require('./Submission/Porter');

// These are in order or import order.
module.exports = [
  Role,
  Resource,
  Form,
  Action,
  Submission,
  ActionItem,
];
