import {Resource} from '../../classes';
import {formio} from '../../util/formio';
import {lodash as _} from '../../util/lodash';

export class Form extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
  }

  public async post(req, res, next) {
    // Default to all roles can read the form.
    req.body.access = (
      'access' in req.body &&
      Array.isArray(req.body.access) &&
      req.body.access.length > 0
    ) ?
      req.body.access :
      [
        {
          type: 'read_all',
          roles: req.context.roles.all.map((role) => role._id),
        },
      ];
    this.callPromisesAsync([
      () => this.callSuper('post', req, res),
      () => this.createDefaultActions(req, res),
    ])
      .then(() => next())
      .catch(next);
  }

  public async put(req, res, next) {
    this.callPromisesAsync([
      () => this.checkModifiedDate(req, res),
      () => this.callSuper('put', req, res),
    ])
      .then(() => next())
      .catch(next);
  }

  public components(req, res, next) {
    if (!req.context.resources.form) {
      return res.status(404).send('Form not found');
    }
    const form = req.context.resources.form;
    // If query params present, filter components that match params
    const filter = Object.keys(req.query).length !== 0 ? _.omit(req.query, ['limit', 'skip']) : null;
    const components = formio.flattenComponents(form.components);

    return res.json(
      Object.values(components).filter((component) => {
        if (!filter) {
          return true;
        }
        return Object.keys(filter).reduce((prev, prop) => {
          const value = filter[prop];
          if (!value) {
            return prev && _.has(component, prop);
          }
          const actualValue = _.get(component, prop, '');
          return prev && actualValue.toString() === value.toString();
        }, true);
      }),
    );
  }

  public async exists(req, res, next) {
    const query = this.indexQuery(req);

    if (Object.keys(_.omit(query, ['project'])).length === 0) {
      return res.status(400).send('Query required');
    }

    // Make sure we can only query the current form.
    query.form = this.app.db.toID(req.context.params.formId);

    const submission = await this.app.models.Submission.findOne(query, {}, req.context.params);

    if (!submission || !submission._id) {
      return res.status(404).send('Not found');
    }

    return res.status(200).json({
      _id: submission._id,
    });
  }

  public async export(req, res, next) {
    const form = req.context.resources.form;
    const exporters = {
      json: {
        extension: 'json',
        contentType: 'application/json',
      },
      csv: {
        extension: 'csv',
        contentType: 'text/csv',
      },
    };

    // Don't allow anonymous access to export.
    if (!req.permissions.admin && !req.user) {
      return res.sendStatus(400);
    }

    // Get the export format.
    const format = (req.query && req.query.format)
      ? req.query.format.toLowerCase()
      : 'json';

    const exporter = exporters[format];

    // Handle unknown formats.
    if (!exporters.hasOwnProperty(format)) {
      return res.status(400).send('Unknown format');
    }

    // Allow them to provide a query.
    let query: any = {};
    if (req.headers.hasOwnProperty('x-query')) {
      try {
        query = JSON.parse(req.headers['x-query']);
      }
      catch (err) {
        res.status(400).send(err);
      }
    }
    else {
      query = this.indexQuery(req);
    }

    // Enforce the form.
    query.form = this.app.db.toID(req.context.params.formId);

    // Skip this owner filter, if the user is the admin or owner.
    if (!req.permissions.all && !req.permissions.admin) {
      // The default ownerFilter query.
      query.owner = this.app.db.toID(req.token.user._id);
    }

    // Load sub forms.
    await this.app.resources.Form.loadSubForms(form, req);

    // TODO: Need to use a cursor or limit in a cross database compatible way.
    const submissions = await this.app.models.Submission.find(query, {}, req.context.params);

    Promise.all(submissions.map(async (submission) => {
      // Load sub submissions.
      await this.app.resources.Submission.loadReferences(form, submission, req);
    }));

    res.resource = {
      items: submissions,
    };

    // Perform after actions like remove protected fields.
    await this.app.resources.Submission.executeFieldHandlers('afterActions', 'index', req, res);

    // TODO Implement exporters.
    res.setHeader('Content-Disposition', `attachment; filename=export.${exporter.extension}`);
    res.setHeader('Content-Type', exporter.contentType);

    res.send(res.resource.items);
  }

  public callSuper(method, req, res) {
    return new Promise((resolve, reject) => {
      super[method](req, res, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

  public async finalize(form, req) {
    if (req.query.full) {
      await this.loadSubForms(form, req);
    }
    return form;
  }

  /**
   * Load all subforms in a form recursively.
   *
   * @param form
   * @param req
   * @param next
   * @param depth
   * @returns {*}
   */
  public async loadSubForms(form, req, depth = 0, forms = {}) {
    // Only allow 5 deep.
    if (depth >= 5) {
      return;
    }

    // Get all of the form components.
    const comps = {};
    const formIds = [];
    const formRevs = [];
    formio.eachComponent(form.components, (component) => {
      if ((component.type === 'form') && component.form && !('components' in component)) {
        const formId = component.form.toString();
        if (!comps[formId]) {
          comps[formId] = [];
          formIds.push(formId);
          if (component.formRevision) {
            formRevs.push(component);
          }
        }
        comps[formId].push(component);
      }
    }, true);

    // Only proceed if we have form components.
    if (!formIds.length) {
      return;
    }

    // Load all subforms in this form.
    const loadedForms = await this.app.loadEntities(req, 'Form', {
      _id: { $in: formIds.map((id) => this.app.db.toID(id))},
    });

    await Promise.all(loadedForms.map(async (subForm) => {
      const formId = subForm._id;
      if (!comps[formId]) {
        return;
      }
      comps[formId].forEach((comp) => {
        comp.components = subForm.components;
      });
      if (forms[formId]) {
        return;
      }
      forms[formId] = true;
      return this.loadSubForms(subForm, req, depth + 1, forms);
    }));
  }

  protected rest() {
    super.rest();
    this.register('get', `${this.route}/:${this.name}Id/components`, 'components');
    this.register('get', `${this.route}/:${this.name}Id/exists`, 'exists');
    this.register('get', `${this.route}/:${this.name}Id/export`, 'export');
    return this;
  }

  protected prepare(item, req) {
    if (item.path) {
      const fragments = item.path.split('/');
      const index = this.app.config.reservedForms.indexOf(fragments[0]);
      if (index !== -1) {
        throw new Error('Form path cannot start with ' + this.app.config.reservedForms[index]);
      }
    }

    const badCharacters = /^[^A-Za-z_]+|[^A-Za-z0-9\-\._]+/g;
    /* eslint-enable no-useless-escape */
    let error = false;
    formio.eachComponent(req.body.components, (component) => {
      // Remove all unsupported characters from api keys.
      if (component.hasOwnProperty('key')) {
        component.key = component.key.replace(badCharacters, '');
      }
      if (component.key === '' && !formio.isLayoutComponent(component)) {
        error = true;
      }
    }, true);

    if (error) {
      throw new Error('All non-layout Form components must have a non-empty API Key.');
    }

    const dedupe = (access) => {
      return Object.values(access.reduce((prev, item) => {
        if (!item || typeof item !== 'object' || !item.type || !item.roles || !Array.isArray(item.roles)) {
          return prev;
        }
        // Dedupe types.
        if (!prev[item.type]) {
          prev[item.type] = item;
        }
        else {
          prev[item.type].roles = [...prev[item.type].roles, ...item.roles];
        }

        // Dedupe roles.
        prev[item.type].roles = prev[item.type].roles.filter((role, index) => {
          try {
            // This is a little weird but we need to test if the value will convert to the id but store as string.
            role = this.app.db.toID(role).toString();
          }
          catch (err) {
            return false;
          }
          // Filter out common problems.
          if (!role || role === 'undefined' || role === 'null' || role === '{}' || role === '[object Object]') {
            return false;
          }
          return prev[item.type].roles.indexOf(role) === index;
        });

        return prev;
      }, {}));
    };

    if (item.access && Array.isArray(item.access)) {
      item.access = dedupe(item.access);
    }

    if (item.submissionAccess && Array.isArray(item.submissionAccess)) {
      item.submissionAccess = dedupe(item.submissionAccess);
    }

    return super.prepare(item, req);
  }

  private createDefaultActions(req, res) {
    return Promise.all(Object.keys(this.app.actions).map((name) => {
      const Action = this.app.actions[name];
      const info = Action.info();
      // Add default actions to the form.
      if (info.default) {
        return this.app.models.Action.create(
          this.app.resources.Action.prepare({
            title: info.title,
            name: info.name,
            priority: info.priority,
            settings: {},
            ...info.defaults,
            entityType: 'form',
            entity: res.resource.item._id, // Entity goes last so they can't change it.
          }, req),
        );
      } else {
        return Promise.resolve();
      }
    }));
  }

  private checkModifiedDate(req, res) {
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
}
