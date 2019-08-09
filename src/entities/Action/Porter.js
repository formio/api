const Porter = require('../../classes/Porter');

module.exports = class Action extends Porter {
  get key() {
    return 'actions';
  }

  get model() {
    return this.app.models.Action;
  }

  import(action) {
    this.mapEntityProperty(action.settings, 'resource', this.maps.resources);
    this.mapEntityProperty(action.settings, 'resources', this.maps.resources);
    this.mapEntityProperty(action.settings, 'role', this.maps.roles);
    // Support old format of actions.
    if (action.hasOwnProperty('form') && !action.hasOwnProperty('entity')) {
      action.entity = action.form;
      action.entityType = 'form';
      delete action.form;
    }
    const formFound = this.mapEntityProperty(action, 'entity', { ...this.maps.forms, ...this.maps.resources });

    // If no changes were made, the form was invalid and we can't insert the action.
    if (!formFound) {
      return undefined;
    }

    return action;
  }

  export(action) {
    this.mapEntityProperty(action, 'entity', { ...this.maps.forms, ...this.maps.resources });
    this.mapEntityProperty(action.settings, 'role', this.maps.roles);
    this.mapEntityProperty(action.settings, 'resource', this.maps.resources);
    this.mapEntityProperty(action.settings, 'resources', this.maps.resources);
    // Like _.pick()
    const { title, name, entity, condition, settings, priority, method, handler } = action;
    return { title, name, entity, condition, settings, priority, method, handler };
  }
};
