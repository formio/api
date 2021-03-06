import * as jsonpatch from 'fast-json-patch';
import * as vm from 'vm';
import {Resource} from '../../classes';
import {log} from '../../log';
import {util} from '../../util';
import {formio as FormioUtils} from '../../util/formio';
import {lodash as _} from '../../util/lodash';
import {fields} from './fields';
import {properties} from './properties';
import {Validator} from './Validator';

export class Submission extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
  }

  get route() {
    return this.path(`/form/:formId/${  this.name}`);
  }

  get actions() {
    return this.app.actions;
  }

  get properties() {
    return properties;
  }

  get fields() {
    return fields;
  }

  public indexQuery(req, query: any = {}) {
    query.form = this.model.toID(req.context.params.formId);
    return super.indexQuery(req, query);
  }

  public getQuery(req, query: any = {}) {
    query.form = this.model.toID(req.context.params.formId);
    return super.getQuery(req, query);
  }

  public async index(req, res, next) {
    log('debug', 'submission index called');
    this.callPromisesAsync([
      this.executeSuper.bind(this, 'index', req, res),
      this.executeFieldHandlers.bind(this, 'afterActions', 'index', req, res),
    ])
      .then(() => {
        log('debug', 'submission index done');
        return next();
      })
      .catch((err) => next(err));
  }

  public async post(req, res, next) {
    log('debug', 'submission post called');
    this.callPromisesAsync([
      this.initializeSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'beforeValidate', 'post', req, res),
      this.validateSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'afterValidate', 'post', req, res),
      this.executeActions.bind(this, 'before', 'create', req, res),
      this.executeSuper.bind(this, 'post', req, res),
      this.executeActions.bind(this, 'after', 'create', req, res),
      this.executeFieldHandlers.bind(this, 'afterActions', 'post', req, res),
    ])
      .then(() => {
        log('debug', 'submission post done');
        return next();
      })
      .catch((err) => next(err));
  }

  public async get(req, res, next) {
    log('debug', 'submission get called');
    this.callPromisesAsync([
      this.executeSuper.bind(this, 'get', req, res),
      this.executeFieldHandlers.bind(this, 'afterActions', 'get', req, res),
    ])
      .then(() => {
        log('debug', 'submission get done');
        return next();
      })
      .catch((err) => next(err));
  }

  public async put(req, res, next) {
    log('debug', 'submission put called');
    this.callPromisesAsync([
      this.initializeSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'beforeValidate', 'put', req, res),
      this.validateSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'afterValidate', 'put', req, res),
      this.executeActions.bind(this, 'before', 'update', req, res),
      this.executeSuper.bind(this, 'put', req, res),
      this.executeActions.bind(this, 'after', 'update', req, res),
      this.executeFieldHandlers.bind(this, 'afterActions', 'put', req, res),
    ])
      .then(() => {
        log('debug', 'submission put done');
        return next();
      })
      .catch((err) => next(err));
  }

  public async patch(req, res, next) {
    log('debug', 'submission patch called');
    this.callPromisesAsync([
      this.initializePatch.bind(this, req, res),
      this.initializeSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'beforeValidate', 'patch', req, res),
      this.validateSubmission.bind(this, req, res),
      this.executeFieldHandlers.bind(this, 'afterValidate', 'patch', req, res),
      this.executeActions.bind(this, 'before', 'update', req, res),
      this.executeSuper.bind(this, 'put', req, res),
      this.executeActions.bind(this, 'after', 'update', req, res),
      this.executeFieldHandlers.bind(this, 'afterActions', 'patch', req, res),
    ])
      .then(() => {
        log('debug', 'submission patch done');
        return next();
      })
      .catch((err) => next(err));
  }

  public async delete(req, res, next) {
    log('debug', 'submission delete called');
    this.callPromisesAsync([
      this.executeSuper.bind(this, 'delete', req, res),
      this.executeFieldHandlers.bind(this, 'afterActions', 'delete', req, res),
    ])
      .then(() => {
        log('debug', 'submission delete done');
        return next();
      })
      .catch((err) => next(err));
  }

  public getBody(req) {
    let { data, owner, access, metadata } = req.body;

    // Only allow setting owner if has "all" type permission.
    if (!req.permissions.all && !req.permissions.admin && !req.permissions.fieldAdmin) {
      owner = undefined;
    }

    if (req.context.resources.submission) {
      if (!data) {
        data = req.context.resources.submission.data;
      }
      if (!owner) {
        owner = req.context.resources.submission.owner;
      }
      if (!access) {
        access = req.context.resources.submission.access;
      }
      if (!metadata) {
        metadata = req.context.resources.submission.metadata;
      }
    }

    return {
      data,
      owner,
      access,
      metadata,
    };
  }

  public initializeSubmission(req, res) {
    log('initializeSubmission');
    req.skipResource = true;

    req.body = this.getBody(req);

    req.body.data = req.body.data || {};

    // Ensure they cannot reset the submission id.
    if ('submissionId' in req.params) {
      req.body._id = req.params.submissionId;
    }

    // Always make sure form is set correctly.
    req.body.form = req.params.formId;

    // Copy roles and externalIds from existing submissions so they arent lost.
    if (req.context.resources.submission) {
      req.body.roles = req.context.resources.submission.roles;
      req.body.externalIds = req.context.resources.submission.externalIds;
    }

    req.body.access = [];

    util.api.eachValue(req.context.resources.form.components, req.body.data, ({ component, data }) => {
      if (component && component.key && component.defaultPermission) {
        let value = _.get(data, component.key);
        if (value) {
          if (!Array.isArray(value)) {
            value = [value];
          }
          const ids = value.map((item) => item && item._id ? item._id : false).filter((item) => item);
          if (ids.length) {
            const perm = _.find(req.body.access, {
              type: component.defaultPermission,
            });
            if (perm) {
              perm.resources = [
                ...perm.resources,
                ...ids,
              ];
            }
            else {
              req.body.access.push({
                type: component.defaultPermission,
                resources: ids,
              });
            }
          }
        }
      }
    }, {});

    // Only allow valid permissions
    req.body.access = req.body.access.filter((access) => ['create', 'read', 'write', 'admin'].includes(access.type));

    // Ensure response is set.
    res.resource = {
      item: req.body,
    };

    // Save off original submission.
    req.submission = _.cloneDeep(req.body);

    return Promise.resolve();
  }

  public async initializePatch(req, res) {
    log('initializePatch');
    req.patchApplied = true;
    const prev = await this.model.read({
      _id: this.model.toID(req.context.params[`${this.name}Id`]),
    }, req.context.params);
    req.body = jsonpatch.applyPatch(prev, req.body).newDocument;
  }

  public validateSubmission(req, res) {
    log('debug', 'validateSubmission');
    return new Promise(async (resolve) => {
      const form = _.cloneDeep(req.context.resources.form);
      await this.app.resources.Form.loadSubForms(form, req);

      const validator = new Validator(form, this.app.models.Submission, req);
      validator.validate(req.body, (err, data) => {
        if (err) {
          return res.status(400).json(err);
        }

        req.body.data = data;
        log('debug', 'validateSubmission done');
        resolve();
      });
    });
  }

  public executeActions(handler, method, req, res) {
    log('debug', 'executeActions', handler, method);

    const promises = [];
    req.context.actions.forEach((action) => {
      if (action.method.includes(method) && action.handler.includes(handler)) {
        const context = {
          jsonLogic: FormioUtils.jsonLogic,
          data: req.body.data,
          form: req.context.resources.form, // Legacy support
          entity: req.context.resources.form,
          query: req.query,
          util: FormioUtils,
          _,
          execute: false,
        };

        if (this.shouldExecute(action, context)) {
          promises.push(() => {
            return this.app.models.ActionItem.create(
              this.app.resources.ActionItem.prepare({
                action: action._id,
                title: action.title,
                dataType: 'submission',
                dataId: req.params.submissionId || req.body._id,
                data: res.resource.item || req.body,
                context: {
                  query: req.query,
                  params: req.params,
                },
                handler,
                method,
                state: 'new',
                messages: [
                  {
                    datetime: new Date(),
                    info: 'New Action Triggered',
                    data: {},
                  },
                ],
              }, req),
            )
              .then((actionItem) => this.app.executeAction(actionItem, req, res));
          });
        }
      }
    });

    return this.callPromisesAsync(promises);
  }

  public shouldExecute(action, context) {
    const condition = action.condition;
    if (!condition) {
      return true;
    }

    if (condition.custom) {
      let json = null;
      try {
        json = JSON.parse(action.condition.custom);
      } catch (e) {
        json = null;
      }

      try {
        const script = new vm.Script(json
          ? `execute = jsonLogic.apply(${condition.custom}, { data, form, _, util })`
          : condition.custom);

        script.runInContext(vm.createContext(context), {
          timeout: 500,
        });

        // @ts-ignore
        return script.execute;
      } catch (err) {
        return false;
      }
    } else {
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

  public executeFieldHandlers(handler, action, req, res) {
    const form = req.context.resources.form;
    let submissions = [];
    if (res.resource && res.resource.items) {
      submissions = res.resource.items;
    } else if (res.resource && res.resource.item) {
      submissions = [res.resource.item];
    } else {
      submissions = [req.body];
    }

    return Promise.all(submissions.map((submission) => {
      return util.api.eachValue(form.components, submission.data, (context) => {
        const promises = [];

        const { component, data, handler, action, path } = context;
        const componentPath = `${path}${path ? '.' : ''}${component.key}`;

        // Execute field actions
        if (this.fields.hasOwnProperty(component.type)) {
          promises.push(this.fields[component.type](component, data, handler, action, {
            path: componentPath,
            req,
            res,
            app: this.app,
          }));
        }

        // Execute property actions.
        Object.keys(this.properties).forEach((property) => {
          if (component.hasOwnProperty(property) && component[property]) {
            promises.push(this.properties[property](component, data, handler, action, {
              path: componentPath,
              req,
              res,
              app: this.app,
            }));
          }
        });

        return Promise.all(promises);
      }, { handler, action, req, res });
    }));
  }

  public async finalize(submission, req) {
    // If this is a newly created submission without an owner (like during registration), set the owner to itself.
    if (!submission.owner) {
      submission.owner = submission._id;
      await this.model.update(submission);
    }
    await this.loadReferences(req.context.resources.form, submission, req);
    return super.finalize(submission, req);
  }

  /**
   * Loads sub submissions from a nested subform hierarchy.
   *
   * @param form
   * @param submission
   * @param req
   * @param next
   * @param depth
   * @return {*}
   */
  public async loadReferences(form, submission, req, depth = 0) {
    // Only allow 5 deep.
    if (depth >= 5) {
      return;
    }
    const subs = {};
    // First load sub forms.
    await this.app.resources.Form.loadSubForms(form, req);

    util.api.eachValue(form.components, submission.data, (context) => {
      const {component, data, path} = context;
      if (!('reference' in component) || component.reference) {
        const value = _.get(data, component.key);
        if (value && value._id) {
          subs[value._id] = {component, path, value: value.data, data};
        }
      }
    }, {});

    // Load all the submissions within this submission.
    const submissions = await this.app.loadEntities(req, 'Submission', {
      _id: {$in: Object.keys(subs).map(this.app.db.toID)},
    });

    if (!submissions || !submissions.length){
      return;
    }

    await Promise.all(submissions.map(async (sub) => {
      const subId = sub._id;
      if (subs[subId]) {
        // Set the subform data if it contains more data... legacy renderers don't fare well with sub-data.
        if (!subs[subId].value || (Object.keys(sub.data).length > Object.keys(subs[subId].value).length)) {
          _.set(subs[subId].data, subs[subId].component.key, sub);
          // Load all subdata within this submission if it is a form.
          if (subs[subId].component.type === 'form') {
            await this.loadReferences(subs[subId].component, sub, req, depth + 1);
          }
        }
      }
    }));
  }

  /**
   * This function will iterate over each value for each component. This means that for each row of a datagrid it will
   * call the callback once for each row's component.
   *
   * @param components
   * @param data
   * @param fn
   * @param context
   * @param path
   * @returns {Promise<any[]>}
   */

  public executeSuper(name, req, res) {
    log('debug', 'executeSuper', name);
    // If we are supposed to skip resource, do so.
    if (req.skipResource) {
      log('debug', 'skipResource');
      return Promise.resolve();
    }

    // Call the Resource method.
    return new Promise((resolve, reject) => {
      super[name](req, res, (err) => {
        log('debug', 'executeSuper done');
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }
}
