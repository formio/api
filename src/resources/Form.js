'use strict'

const Resource = require('../libraries/Resource');

module.exports = class Form extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
  }

  createDefaultAction(req, res) {
    return this.app.models.Action.create({
      name: 'save',
      title: 'Save Submission',
      form: res.resource.item._id,
      priority: 10,
      handler: ['before'],
      method: ['create', 'update'],
      settings: {}
    });
  }

  post(req, res, next) {
    this.callPromisesAsync([
      () => new Promise((resolve, reject) => {
        super.post(req, res, (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        })
      }),
      this.createDefaultAction.bind(this, req, res)
    ])
      .then(() => next())
      .catch(err => next(err));
  }
};
