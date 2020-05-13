import {Action} from '../../../classes';
import {lodash as _} from '../../../util/lodash';

export class SaveSubmission extends Action {
  public static info() {
    return {
      name: 'save',
      title: 'Save Submission',
      group: 'default',
      description: 'Saves the submission into the database.',
      priority: 10,
      default: true,
      defaults: {
        handler: ['before'],
        method: ['create', 'update'],
      },
      access: {
        handler: false,
        method: false,
      },
    };
  }

  public static settingsForm(options) {
    return super.settingsForm(options, [
      {
        type: 'resourcefields',
        key: 'resource',
        title: 'Save submission to',
        placeholder: 'This form',
        basePath: options.baseUrl,
        form: options.params.formId,
        required: false,
      },
    ]);
  }

  public async resolve({ req }, setActionInfoMessage) {
    // Don't run the action if dryrun is set.
    if (req.query && req.query.dryrun) {
      return;
    }

    req.skipResource = false;

    if (this.settings && this.settings.resource) {
      // Skip this resource.
      req.skipResource = true;

      const resource = await this.app.loadEntity(req, 'Form', {
        type: 'resource',
        _id: this.app.db.toID(this.settings.resource),
      });

      const submission = req.context.resources.submission;
      let type = 'create';
      let externalSubmission: any = {data: {}, roles: []};

      if (submission) {
        const external = _.find(submission.externalIds, {
          type: 'resource',
          resource: this.settings.resource,
        });

        if (!external) {
          return;
        }

        type = 'update';
        externalSubmission = await this.app.models.Submission.findOne({
          form: this.settings.resource,
          _id: this.app.db.toID(external.id),
        }, null, req.context.params);
      }

      // Map fields to resource.
      const fields = this.settings.fields || {};
      Object.keys(fields).forEach((key) => {
        _.set(externalSubmission.data, key, _.get(req.body.data, fields[key]));
      });

      const method = type === 'create' ? 'POST' : 'PUT';

      const result: any = await this.app.makeChildRequest({
        req,
        url: '/form/:formId/submission' + (type === 'create' ? '' : '/:submissionId'),
        middleware: this.app.resources.Submission[method.toLowerCase()].bind(this.app.resources.Submission),
        body: externalSubmission,
        method,
        params: {
          ...req.context.params,
          formId: this.settings.resource,
          submissionId: externalSubmission._id,
        },
        options: {
          permissionsChecked: true,
        },
      });

      if (this.settings.property) {
        req.body.data[this.settings.property] = result;
      }

      if (type === 'create' && result) {
        req.body.externalIds = req.body.externalIds || [];
        req.body.externalIds.push({
          type: 'resource',
          resource: this.settings.resource,
          id: result._id,
        });
      }

      return;
    }

    setActionInfoMessage('Saving to original form.');
    return;
  }
}
