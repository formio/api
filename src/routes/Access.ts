import {Route} from '../classes';

export class Access extends Route {
  get path() {
    return `${super.path}/access`;
  }

  get description() {
    return 'Access endpoint';
  }

  get responses() {
    return {
      200: {
        description: 'Access results',
        content: {
          'application/json': {},
        },
      },
    };
  }

  public execute(req, res) {
    Promise.all([
      this.app.models.Role.find({}, {}, req.context.params),
      this.app.models.Form.find({}, {}, req.context.params),
    ])
      .then((results) => {
        res.send({
          forms: results[1].reduce((result, form) => {
            result[form.name] = {
              _id: form._id,
              access: form.access,
              name: form.name,
              path: form.path,
              submissionAccess: form.submissionAccess,
              title: form.title,
            };
            return result;
          }, {}),
          roles: results[0].reduce((result, role) => {
            result[role.title.replace(/\s/g, '').toLowerCase()] = {
              _id: role._id,
              admin: role.admin,
              title: role.title,
              default: role.default,
            };
            return result;
          }, {}),
        });
      });
  }
}
