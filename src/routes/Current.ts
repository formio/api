const Route = require('../classes/Route');

module.exports = class Current extends Route {
  get path() {
    return `${super.path}/current`;
  }

  execute(req, res) {
    // TODO: convert this to subrequest? Need to protect password field.
    res.send(req.user);
  }
};
