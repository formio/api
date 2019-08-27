const Route = require('../classes/Route');

module.exports = class Status extends Route {
  get path() {
    return '/status';
  }

  execute(req, res) {
    res.send(this.app.getStatus());
  }
};
