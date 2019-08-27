const Route = require('../classes/Route');

module.exports = class Access extends Route {
  get path() {
    return `${super.path}/access`;
  }

  execute(req, res) {
    Promise.all([
      this.app.models.Role.find({}),
      this.app.models.Form.find({}),
    ])
      .then(results => {
        res.send({
          roles: results[0].reduce((result, role) => {
            result[role.title.replace(/\s/g, '').toLowerCase()] = {
              _id: role._id,
              title: role.title,
              admin: role.admin,
              default: role.default,
            };
            return result;
          }, {}),
          forms: results[1].reduce((result, form) => {
            result[form.name] = {
              _id: form._id,
              title: form.title,
              name: form.name,
              path: form.path,
              access: form.access,
              submissionAccess: form.submissionAccess,
            };
            return result;
          }, {}),
        });
      });
  }
};
