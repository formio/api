'use strict';

const Resource = require('../../classes/Resource');
const { eachComponent } = require('../../libraries/Util');

module.exports = class Action extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
    this.register('get', '/form/:formId/actions/:name', 'actionSettings');
    this.register('get', '/form/:formId/actions', 'actionsIndex');
  }

  get route() {
    return this.path(`/form/:formId/${  this.name}`);
  }

  getQuery(req, query = {}) {
    query.form = this.model.toID(req.params.formId);
    return super.getQuery(req, query);
  }

  actionsIndex(req, res) {
    const actions = [];
    for (const key in this.app.actions.submission) {
      actions.push(this.getActionInfo(this.app.actions.submission[key]));
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
      baseUrl: this.path('/form'),
      components,
      roles: Object.values(req.context.roles.all),
      componentsUrl: this.path(`/form/${req.params.formId}/components`)
    };
    if (action && this.app.actions.submission[action]) {
      const info = this.getActionInfo(this.app.actions.submission[action]);
      options.info = info;
      info.settingsForm = {
        action: this.path(`/form/${req.params.formId}/action`),
        components: this.app.actions.submission [action].settingsForm(options)
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

    // Always make sure form is set correctly.
    item.form = req.params.formId;

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
