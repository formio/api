import {Route} from '../classes';

export class Current extends Route {
  get path() {
    return `${super.path}/current`;
  }

  public execute(req, res) {
    // TODO: convert this to subrequest? Need to protect password field.
    res.send(req.user);
  }
}
