const _get = require('lodash/get');
const _set = require('lodash/set');
const _each = require('lodash/each');
const utils = require('formiojs/utils');

module.exports = (component, data, handler, action, { req, res, app }) => {
  if (['afterValidation'].includes(handler) && ['put', 'patch', 'post'].includes(action)) {
    // Get the submission object.
    const body = _get(data, component.key);

    // Make sure to pass along the submission state to the subforms.
    if (req.body.state) {
      body.state = req.body.state;
    }

    // if there isn't a sub-submission or the sub-submission has an _id, don't submit.
    // Should be submitted from the frontend.
    if (
      (req.method === 'POST' && body._id) ||
      (req.method === 'PATCH' && !body._id) ||
      (req.method === 'PUT' && !body._id)
    ) {
      return Promise.resolve();
    }

    // Only execute if the component should save reference and conditions do not apply.
    if (
      (component.hasOwnProperty('reference') && !component.reference) ||
      !utils.checkCondition(component, data, req.body.data)
    ) {
      return Promise.resolve();
    }

    let url = '/form/:formId/submission';
    if (action === 'put' || action === 'patch') {
      url += '/:submissionId';
    }

    // Patch at this point should be a subrequest put.
    const method = (action === 'post') ? 'post' : 'put';

    const params = {
      formId: component.form,
    };

    if (body._id) {
      params.submissionId = body._id;
    }

    return app.makeChildRequest({ url, method, body, params, req, res })
      .then((childRes) => {
        _set(data, component.key, childRes.resource.item);
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
      const compValue = _get(data, component.key);

      // Fetch the child form's submission
      if (compValue && compValue._id) {
        return app.models.Submission.findOne({
          _id: app.db.toID(compValue._id),
          deleted: { $eq: null },
        })
          .catch((err) => app.log('info', err))
          .then((submission) => {
            let found = false;
            submission.externalIds = submission.externalIds || [];
            _each(submission.externalIds, function(externalId) {
              if (externalId.type === 'parent') {
                found = true;
              }
            });
            if (found) {
              // externalId already set.
              return Promise.resolve();
            } else {
              // Set new externalId and save.
              submission.externalIds.push({
                type: 'parent',
                id: res.resource.item._id,
              });
              return app.models.Submission.update(submission);
            }
          });
      }
    }
  }

  // TODO: May want to also implement delete action to delete sub forms.

  return Promise.resolve();
};
