'use strict'

const Resource = require('../libraries/Resource');

module.exports = class Submission extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
  }

  get route() {
    return this.path('/form/:formId/' + this.name);
  }

  get actions() {
    return this.app.resources.Action.actions;
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
      this.executeFieldHandlers.bind(this, false, req, res),
      this.validateSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, true, req, res),
      this.executeActions.bind(this, 'before', 'create', req, res),
      this.executeSuper.bind(this, 'post', req, res),
      this.executeActions.bind(this, 'after', 'create', req, res),
      this.executeFieldHandlers.bind(this, true, req, res),
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
      this.executeFieldHandlers.bind(this, false, req, res),
      this.validateSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, true, req, res),
      this.executeActions.bind(this, 'before', 'update', req, res),
      this.executeSuper.bind(this, 'put', req, res),
      this.executeActions.bind(this, 'after', 'update', req, res),
      this.executeFieldHandlers.bind(this, true, req, res),
    ])
      .then(() => next())
      .catch(err => next(err));
  }

  patch(req, res, next) {
    this.callPromisesAsync([
      this.initializeSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, false, req, res),
      this.validateSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, true, req, res),
      this.executeActions.bind(this, 'before', 'update', req, res),
      this.executeSuper.bind(this, 'put', req, res),
      this.executeActions.bind(this, 'after', 'update', req, res),
      this.executeFieldHandlers.bind(this, true, req, res),
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

  executeFieldHandlers(hasValidated, req, res) {
    console.log('executeFieldHandlers', hasValidated);
    return Promise.resolve();
  }

  validateSubmission(req, res) {
    console.log('validateSubmission');
    return Promise.resolve();
  }

  executeActions(handler, method, req, res) {
    console.log('executeActions', handler);
    const actions = [];
    req.context.actions.forEach(action => {
      if (action.method.includes(method) && action.handler.includes(handler)) {
        // TODO: Check for conditional actions.
        if (this.actions.hasOwnProperty(action.name)) {
          const instance = new this.actions[action.name](this.app, action.settings);
          actions.push(instance.resolve.bind(instance, handler, method, req, res));
        }
      }
    });
    return this.callPromisesAsync(actions);
  }

  executeSuper(name, req, res) {
    console.log('executeSuper', name);
    // If we are supposed to skip resource, do so.
    if (req.skipResource) {
      console.log('skip super');
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
