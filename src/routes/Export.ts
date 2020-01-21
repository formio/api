import {Route} from '../classes';

export class Export extends Route {
  get path() {
    return `${super.path}/export`;
  }

  get description() {
    return 'Export template';
  }

  get responses() {
    return {
      200: {
        description: 'Template',
        content: {
          'application/json': {},
        },
      },
    };
  }

  public execute(req, res, next) {
    this.app.exportTemplate(req)
      .then((result) => {
        res.status(200).send(result);
      })
      .catch(next);
  }
}
