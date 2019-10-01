import {default as _} from '../../../util/lodash';

module.exports = (component, data, handler, action, { req, path, app }) => {
  if (['afterValidate'].includes(handler)) {
    // If this is an update and no password is provided get it from the current submission.
    if (['put', 'patch'].includes(action) && !_.get(data, component.key)) {
      const oldData = (path === '') ? req.context.resources.submission.data : _.get(req.context.resources.submission.data, path);
      _.set(data, component.key, _.get(oldData, component.key));
      return Promise.resolve();
    }

    // If this has a new value, encrypt it.
    if (['put', 'patch', 'post'].includes(action) && _.get(data, component.key)) {
      return app.encrypt(_.get(data, component.key))
        .then((hash) => {
          _.set(data, component.key, hash);
          if (action !== 'post') {
            // Since the password was changed, invalidate all user tokens.
            req.body.metadata = req.body.metadata || {};
            req.body.metadata.jwtIssuedAfter = req.tokenIssued || (Date.now() / 1000);
          }
        });
    }
  }

  // Don't ever return password fields.
  if (['afterActions'].includes(handler)) {
    _.unset(data, component.key);
  }

  return Promise.resolve();
};
