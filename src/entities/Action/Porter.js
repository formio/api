const Porter = require('../_portation/Porter');

module.exports = class Action extends Porter {
  get key() {
    return 'actions';
  }

  get model() {
    return this.app.models.Action;
  }

  transform(action) {
    this.mapEntityProperty(action.settings, 'resources', this.template.resources);
    this.mapEntityProperty(action.settings, 'role', this.template.roles);
    const formFound = this.mapEntityProperty(action, 'form', this.template.forms);

    // If no changes were made, the form was invalid and we can't insert the action.
    if (!formFound) {
    return undefined;
  }

  return action;
}
};
