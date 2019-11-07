import {Resource} from '../../classes';
import {formio} from '../../util/formio';
import {lodash as _} from '../../util/lodash';

export class Form extends Resource {
  constructor(model, router, app) {
    super(model, router, app);
  }

  public post(req, res, next) {
    this.callPromisesAsync([
      () => this.callSuper('post', req, res),
      () => this.createDefaultActions(req, res),
    ])
      .then(() => next())
      .catch(next);
  }

  public put(req, res, next) {
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
      Object.values(components).filter((key) => {
        const component = components[key];
        if (!filter) {
          return true;
        }
        return Object.keys(filter).reduce((prev, value, prop) => {
          if (!value) {
            return prev && _.has(component, prop);
          }
          const actualValue = _.get(component, prop);
          return prev && actualValue.toString() === value.toString();
        }, true);
      }),
    );
  }

  public async exists(req, res, next) {
    const query = this.indexQuery(req);

    // Make sure we can only query the current form.
    query.form = this.app.db.toID(req.context.params.formId);

    const submission = await this.app.models.Submission.findOne(query, null, req.context.params);

    if (!submission || !submission._id) {
      return res.status(404).send('Not found');
    }

    return res.status(200).json({
      _id: submission._id,
    });
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

  protected rest() {
    super.rest();
    this.register('get', `${this.route}/:${this.name}Id/components`, 'components');
    this.register('get', `${this.route}/:${this.name}Id/exists`, 'exists');
    return this;
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
