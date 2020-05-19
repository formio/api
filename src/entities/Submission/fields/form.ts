import {formio} from '../../../util/formio';
import {lodash as _} from '../../../util/lodash';

export const form = async (component, data, handler, action, { req, res, app }) => {
  if (['afterValidate'].includes(handler) && ['put', 'patch', 'post'].includes(action)) {
    // Get the submission object.
    const body = _.get(data, component.key, {});

    // Make sure to pass along the submission state to the subforms.
    if (req.body.state) {
      body.state = req.body.state;
    }

    // If there is no data to submit (like a hidden form), don't submit.
    if (!body.data) {
      return;
    }

    // if there isn't a sub-submission or the sub-submission has an _id, don't submit.
    // Should be submitted from the frontend.
    if (
      (req.method === 'POST' && body._id) ||
      (req.method === 'PATCH' && !body._id) ||
      (req.method === 'PUT' && !body._id)
    ) {
      return;
    }

    // Only execute if the component should save reference and conditions do not apply.
    if (
      (component.hasOwnProperty('reference') && !component.reference) ||
      !formio.checkCondition(component, data, req.body.data, null, null)
    ) {
      return;
    }

    // Patch at this point should be a subrequest put.
    const method = (action === 'post') ? 'post' : 'put';

    const params: any = {
      ...req.context.params,
      formId: component.form,
    };

    if (body._id) {
      params.submissionId = body._id;
    }

    const childSubmission = await app.makeChildRequest({
      req,
      url: '/form/:formId/submission' + (['put', 'patch'].includes(action) ? '/:submissionId' : ''),
      middleware: app.resources.Submission[method.toLowerCase()].bind(app.resources.Submission),
      body,
      method,
      params,
    });
    _.set(data, component.key, {
      _id: app.db.toID(childSubmission._id),
    });
  }

  if (['afterActions'].includes(handler) && ['put', 'patch', 'post'].includes(action)) {
    if (
      res.resource &&
      res.resource.item &&
      res.resource.item.data &&
      (!component.hasOwnProperty('reference') || component.reference)
    ) {
      // Get child form component's value
      const compValue = _.get(data, component.key);

      // Fetch the child form's submission
      if (compValue && compValue._id) {
        const submission = await app.models.Submission.findOne({
          _id: app.db.toID(compValue._id),
          deleted: { $eq: null },
        }, {}, req.context.params);
        let found = false;
        submission.externalIds = submission.externalIds || [];
        submission.externalIds.forEach((externalId) => {
          if (externalId.type === 'parent') {
            found = true;
          }
        });
        if (found) {
          // externalId already set.
          return;
        } else {
          // Set new externalId and save.
          submission.externalIds.push({
            type: 'parent',
            id: res.resource.item._id,
          });
          return app.models.Submission.update(submission);
        }
      }
    }
  }

  // TODO: May want to also implement delete action to delete sub forms.

  return;
};
