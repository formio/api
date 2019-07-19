'use strict';

const _ = require('lodash');
const Resource = require('../../Classes/Resource');

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

  checkModifiedDate(req, res) {
    if (!req.body.hasOwnProperty('modified') || !req.body.hasOwnProperty('components')) {
      return Promise.resolve();
    }

    const current = new Date();
    const timeStable = new Date(_.get(req.context.resources.form, 'modified', current.getTime())).getTime();
    const timeLocal = new Date(_.get(req, 'body.modified', current.getTime())).getTime();
    if (timeStable <= timeLocal) {
      return Promise.resolve();
    }

    res.status(409).send(req.context.resources.form);
  }

  post(req, res, next) {
    this.callPromisesAsync([
      () => new Promise((resolve, reject) => {
        super.post(req, res, (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      }),
      this.createDefaultAction.bind(this, req, res)
    ])
      .then(() => next())
      .catch(next);
  }

  put(req, res, next) {
    this.callPromisesAsync([
      this.checkModifiedDate.bind(this, req, res),
      () => new Promise((resolve, reject) => {
        super.put(req, res, (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      }),
    ])
      .then(() => next())
      .catch(next);
  }
};
