const Action = require('../../../classes/Action');

module.exports = class SaveSubmission extends Action {
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
    req.skipResource = false;

    if (this.settings && this.settings.resource) {
      // Skip this resource.
      req.skipResource = true;

      const resource = await this.app.models.Form.findOne({
        type: 'resource',
        _id: this.app.db.toID(this.settings.resource),
      }, null, req.context.params);

      const submission = req.context.resources.submission;
      let type = 'create';
      let externalSubmission = {data: {}, roles: []};

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
      // TODO: This should really use _.get and _.set.
      _.each(this.settings.fields, function(field, key) {
        if (submission.data.hasOwnProperty(field)) {
          externalSubmission.data[key] = submission.data[field];
        }
      });

      const result = await this.app.makeChildRequest({
        req,
        url: '/form/:formId/submission' + (type === 'create' ? '' : '/:submissionId'),
        submission,
        method: type === 'create' ? 'POST' : 'PUT',
        params: {
          ...req.context.params,
          submissionId: submission._id,
        },
        query: {},
        options: {},
      });

      // TODO: Save submission to externalIds if create

      return;
    }

    setActionInfoMessage('Saving to original form.');
    return;
  }
};
