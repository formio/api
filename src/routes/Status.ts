import {Route} from '../classes';

export class Status extends Route {
  get path() {
    return '/status';
  }

  public execute(req, res) {
    res.send(this.app.getStatus());
  }
}
