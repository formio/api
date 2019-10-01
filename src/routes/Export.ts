import {Route} from '../classes';

export class Export extends Route {
  get path() {
    return `${super.path}/export`;
  }

  public execute(req, res, next) {
    this.app.exportTemplate(req)
      .then((result) => {
        res.status(200).send(result);
      })
      .catch(next);
  }
};
