'use strict';

const Resource = require('../../classes/Resource');
const { eachComponent } = require('../../util');

module.exports = class Action extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
    this.register('get', `${this.route}s/:name`, 'actionSettings');
    this.register('get', `${this.route}s`, 'actionsIndex');
  }

  get route() {
    return this.path(`/form/:formId/${this.name}`);
  }

  indexQuery(req, query = {}) {
    query.entity = this.model.toID(req.context.params.formId);
    return super.indexQuery(req, query);
  }

  getQuery(query, req) {
    query.entity = this.model.toID(req.context.params.formId);
    return super.getQuery(req, query);
  }

  actionsIndex(req, res) {
    const actions = [];
    for (const key in this.app.actions) {
      actions.push(this.getActionInfo(this.app.actions[key]));
    }
    res.send(actions);
  }

  getActionInfo(action) {
    const info = action.info();
    info.defaults = Object.assign(info.defaults || {}, {
      priority: info.priority || 0,
      name: info.name,
      title: info.title
    });

    return info;
  }

  actionSettings(req, res, next) {
    const action = req.params.name;
    const components = [];

    eachComponent(req.context.resources.form.components, component => {
      components.push({
        key: component.key,
        label: component.label || component.title || component.legend
      });
    });
    const options = {
      baseUrl: this.app.url(this.path('/form'), req),
      params: req.context.params,
      components,
      roles: Object.values(req.context.roles.all),
      componentsUrl: this.app.url(this.path('/form/:formId/components'), req)
    };
    if (action && this.app.actions[action]) {
      const info = this.getActionInfo(this.app.actions[action]);
      options.info = info;
      info.settingsForm = {
        action: this.path(`/form/${req.params.formId}/action`),
        components: this.app.actions [action].settingsForm(options)
      };
      return res.json(info);
    }
    else {
      return next(new Error('Action not found'));
    }
  }

  prepare(item, req) {
    // Some renderers will submit submission data instead of an action. Fix it here.
    if (item.hasOwnProperty('data')) {
      item = item.data;
    }

    // Ensure they cannot reset the submission id.
    if (req.params.hasOwnProperty('actionId')) {
      item._id = req.params.actionId;
    }

    // For now all actions are for forms.
    item.entityType = 'form';

    item = super.prepare(item, req);

    return item;
  }

  executeSuper(name, req, res) {
    // If we are supposed to skip resource, do so.
    if (req.skipResource) {
      return Promise.resolve();
    }

    // Call the Resource method.
    return new Promise((resolve, reject) => {
      super[name](req, res, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }
};
