'use strict'

const FormioUtils = require('formiojs/utils');
const _ = require('lodash');
const vm = require('vm');
const Validator = require('../libraries/Validator');
const Resource = require('../libraries/Resource');

module.exports = class Submission extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
  }

  get route() {
    return this.path('/form/:formId/' + this.name);
  }

  get actions() {
    return this.app.actions;
  }

  getQuery(req, query = {}) {
    query.form = this.model.toID(req.params.formId);
    return super.getQuery(req, query);
  }

  // index(req, res, next) {
  //   Promise.all([
  //     this.executeSuper('index', req, res)
  //   ])
  //     .then(() => next())
  //     .catch(err => next(err));
  // }

  post(req, res, next) {
    this.callPromisesAsync([
      this.initializeSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'before', req, res),
      this.validateSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'before', req, res),
      this.executeActions.bind(this, 'before', 'create', req, res),
      this.executeSuper.bind(this, 'post', req, res),
      this.executeActions.bind(this, 'after', 'create', req, res),
      this.executeFieldHandlers.bind(this, 'after', req, res),
    ])
      .then(() => next())
      .catch(err => next(err));
  }

  // get(req, res, next) {
  //   Promise.all([
  //     this.executeSuper('get', req, res)
  //   ])
  //     .then(() => next())
  //     .catch(err => next(err));
  // }

  put(req, res, next) {
    this.callPromisesAsync([
      this.initializeSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'before', req, res),
      this.validateSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'before', req, res),
      this.executeActions.bind(this, 'before', 'update', req, res),
      this.executeSuper.bind(this, 'put', req, res),
      this.executeActions.bind(this, 'after', 'update', req, res),
      this.executeFieldHandlers.bind(this, 'after', req, res),
    ])
      .then(() => next())
      .catch(err => next(err));
  }

  patch(req, res, next) {
    this.callPromisesAsync([
      this.initializeSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'before', req, res),
      this.validateSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'before', req, res),
      this.executeActions.bind(this, 'before', 'update', req, res),
      this.executeSuper.bind(this, 'put', req, res),
      this.executeActions.bind(this, 'after', 'update', req, res),
      this.executeFieldHandlers.bind(this, 'after', req, res),
    ])
      .then(() => next())
      .catch(err => next(err));
  }

  // delete(req, res, next) {
  //   Promise.all([
  //     this.executeSuper('delete', req, res)
  //   ])
  //     .then(() => next())
  //     .catch(err => next(err));
  // }

  getBody(req) {
    const {data, owner, access, metadata} = req.body;

    return {
      data,
      owner,
      access,
      metadata,
    }
  }

  initializeSubmission(req, res) {
    console.log('initializeSubmission');
    req.skipResource = true;

    req.body = this.getBody(req);

    // Ensure there is always a data body.
    req.body.data = req.body.data || {};

    // Ensure they cannot reset the submission id.
    if (req.context.params.hasOwnProperty('submission')) {
      req.body._id = req.context.params['submission'];
    }

    // Always make sure form is set correctly.
    req.body.form = req.context.params['form'];

    // Ensure response is set.
    res.resource = {
      item: req.body
    };

    return Promise.resolve();
  }

  executeFieldHandlers(handler, req, res) {
    console.log('executeFieldHandlers', handler);
    return Promise.resolve();
  }

  validateSubmission(req, res) {
    return new Promise((resolve, reject) => {
      const validator = new Validator(req.context.resources.form, this.app.models.Submission, req.token);
      validator.validate(req.body, (err, data) => {
        if (err) {
          return res.status(400).json(err);
        }

        req.body.data = data;
        resolve();
      });
    });
  }

  executeActions(handler, method, req, res) {
    const actions = [];
    req.context.actions.forEach(action => {
      if (action.method.includes(method) && action.handler.includes(handler)) {
        const context = {
          jsonLogic: FormioUtils.jsonLogic,
          data: req.body.data,
          form: req.context.resources.form,
          query: req.query,
          util: FormioUtils,
          _,
          execute: false
        };

        if (this.shouldExecute(action, context)) {
          actions.push(() => {
            return this.app.models.ActionEvent.create({
              title: action.title,
              name: action.name,
              form: req.params.formId,
              submission: req.params.submissionId
            })
              .then(event => {
                // If action exists on this server, execute immediately.
                if (this.actions.hasOwnProperty(action.name)) {
                  const instance = new this.actions[action.name](this.app, action.settings);
                  return instance.resolve(handler, method, req, res, event)
                    .then(() => {
                      event.state = 'executed';
                      this.app.models.ActionEvent.update(event);
                    })
                    .catch(error => {
                      event.state = 'error';
                      event.errors = [error];
                      this.app.models.ActionEvent.update(event);
                    });
                }
              });
          })
        }
      }
    });
    return this.callPromisesAsync(actions);
  }

  shouldExecute(action, context) {
    const condition = action.condition;
    if (!condition) {
      return true;
    }

    if (condition.custom) {
      let json = null;
      try {
        json = JSON.parse(action.condition.custom);
      }
      catch (e) {
        json = null;
      }

      try {
        const script = new vm.Script(json
          ? `execute = jsonLogic.apply(${condition.custom}, { data, form, _, util })`
          : condition.custom);

        script.runInContext(vm.createContext(context), {
          timeout: 500
        });

        return sandbox.execute;
      }
      catch (err) {
        return false;
      }
    }
    else {
      if (_.isEmpty(condition.field) || _.isEmpty(condition.eq)) {
        return true;
      }

      // See if a condition is not established within the action.
      const field = condition.field || '';
      const eq = condition.eq || '';
      const value = String(_.get(context, `data.${field}`, ''));
      const compare = String(condition.value || '');

      // Cancel the action if the field and eq aren't set, in addition to the value not being the same as compare.
      return (eq === 'equals') ===
        ((Array.isArray(value) && value.map(String).includes(compare)) || (value === compare));
    }
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
