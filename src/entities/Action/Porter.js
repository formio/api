const Porter = require('../../Classes/Porter');

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
    const formFound = this.mapEntityProperty(action, 'form', { ...this.maps.forms, ...this.maps.resources });

    // If no changes were made, the form was invalid and we can't insert the action.
    if (!formFound) {
      return undefined;
    }

    return action;
  }

  export(action) {
    this.mapEntityProperty(action, 'form', { ...this.maps.forms, ...this.maps.resources });
    this.mapEntityProperty(action.settings, 'role', this.maps.roles);
    this.mapEntityProperty(action.settings, 'resource', this.maps.resources);
    this.mapEntityProperty(action.settings, 'resources', this.maps.resources);
    // Like _.pick()
    const { title, name, form, condition, settings, priority, method, handler } = action;
    return { title, name, form, condition, settings, priority, method, handler };
  }
};
