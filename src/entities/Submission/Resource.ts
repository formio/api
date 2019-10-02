import * as vm from 'vm';
import {Resource} from '../../classes';
import {log} from '../../log';
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

  public indexQuery(req, query: any = {}) {
    query.form = this.model.toID(req.context.params.formId);
    return super.indexQuery(req, query);
  }

  public getQuery(query, req) {
    query.form = this.model.toID(req.context.params.formId);
    return super.getQuery(query, req);
  }

  public index(req, res, next) {
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

  public post(req, res, next) {
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

  public get(req, res, next) {
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

  public put(req, res, next) {
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

  public patch(req, res, next) {
    log('debug', 'submission patch called');
    this.callPromisesAsync([
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

  public delete(req, res, next) {
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
    const { data, owner, access, metadata } = req.body;

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

    // Ensure there is always a data body.
    req.body.data = req.body.data || {};

    // Ensure they cannot reset the submission id.
    if (req.params.hasOwnProperty('submissionId')) {
      req.body._id = req.params.submissionId;
    }

    // Always make sure form is set correctly.
    req.body.form = req.params.formId;

    // Copy roles and externalIds from existing submissions so they arent lost.
    if (req.context.resources.submission) {
      req.body.roles = req.context.resources.submission.roles;
      req.body.externalIds = req.context.resources.submission.externalIds;
    }

    // Ensure response is set.
    res.resource = {
      item: req.body,
    };

    // Save off original submission.
    req.submission = _.cloneDeep(req.body);

    return Promise.resolve();
  }

  public validateSubmission(req, res) {
    log('debug', 'validateSubmission');
    return new Promise((resolve) => {
      const validator = new Validator(req.context.resources.form, this.app.models.Submission, req.token);
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
      return this.eachValue(form.components, submission.data, (context) => {
        const promises = [];

        const { component, data, handler, action, path } = context;

        // Execute field actions
        if (fields.hasOwnProperty(component.type)) {
          promises.push(fields[component.type](component, data, handler, action, {
            path,
            req,
            res,
            app: this.app,
          }));
        }

        // Execute property actions.
        Object.keys(properties).forEach((property) => {
          if (component.hasOwnProperty(property) && component[property]) {
            promises.push(properties[property](component, data, handler, action, { req, res, app: this }));
          }
        });

        return Promise.all(promises);
      }, { handler, action, req, res });
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
  public eachValue(components, data, fn, context, path = '') {
    const promises = [];

    components.forEach((component) => {
      if (component.hasOwnProperty('components') && Array.isArray(component.components)) {
        // If tree type is an array of objects like datagrid and editgrid.
        if (['datagrid', 'editgrid'].includes(component.type) || component.arrayTree) {
          _.get(data, component.key, []).forEach((row, index) => {
            promises.push(this.eachValue(
              component.components,
              row,
              fn,
              context,
              (path ? `${path}.` : '') + `${component.key}[${index}]`,
            ));
          });
        } else if (['form'].includes(component.type)) {
          promises.push(this.eachValue(
            component.components,
            _.get(data, `${component.key}.data`, {}),
            fn,
            context,
            (path ? `${path}.` : '') + `${component.key}.data`,
          ));
        } else if (
          ['container'].includes(component.type) ||
          (
            component.tree &&
            !['panel', 'table', 'well', 'columns', 'fieldset', 'tabs', 'form'].includes(component.type)
          )
        ) {
          promises.push(this.eachValue(
            component.components,
            _.get(data, component.key),
            fn,
            context,
            (path ? `${path}.` : '') + `${component.key}`,
          ));
        } else {
          promises.push(this.eachValue(component.components, data, fn, context, path));
        }
      } else if (component.hasOwnProperty('columns') && Array.isArray(component.columns)) {
        // Handle column like layout components.
        component.columns.forEach((column) => {
          promises.push(this.eachValue(column.components, data, fn, context, path));
        });
      } else if (component.hasOwnProperty('rows') && Array.isArray(component.rows)) {
        // Handle table like layout components.
        component.rows.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((column) => {
              promises.push(this.eachValue(column.components, data, fn, context, path));
            });
          }
        });
      } else {
        // If this is just a regular component, call the callback.
        promises.push(fn({ ...context, data, component, path }));
      }
    });

    return Promise.all(promises);
  }

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
