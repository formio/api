const _ = require('lodash');

module.exports = (component, data, handler, action) => {
  // encryptField(req, component, path, next) {
  //   formio.encrypt(_.get(req.body, `data.${path}`), function encryptResults(err, hash) {
  //     if (err) {
  //       return next(err);
  //     }
  //
  //     _.set(req.body, `data.${path}`, hash);
  //     next();
  //   });
  // },

  if (['afterValidation'].includes(handler)) {
    // If there is no data, don't continue.
    if (!data || !_.has(data, 'data.${component.key}')) {
      return Promise.resolve();
    }

    switch(action) {
      case 'put':
      case 'patch':
        if (_.get(data, `data.${component.key}`)) {
          // this.encryptField(req, component, path, next);
          // Since the password was changed, invalidate all user tokens.
          req.body.metadata = req.body.metadata || {};
          req.body.metadata.jwtIssuedAfter = req.tokenIssued || (Date.now() / 1000);
        }
        else {
          // If there is no password provided get it from the current submission.

          // formio.cache.loadCurrentSubmission(req, function cacheResults(err, submission) {
          //   if (err) {
          //     return next(err);
          //   }
          //   if (!submission) {
          //     return next(new Error('No submission found.'));
          //   }
          //
          //   _.set(req.body, `data.${path}`, _.get(submission.data, path));
          //   next();
          // });
        }

        break;
      case 'post':
        if (_.has(data, `data.${component.key}`)) {
          this.encryptField(req, component, path, next);
        }
        break;
    }
    return Promise.resolve();
  }

  // Don't return password fields for gets.
  if (['afterActions'].includes(handler) && ['get', 'index'].includes(action)) {
    _.unset(data, component.key);
  }

  return Promise.resolve();
};
