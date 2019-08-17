const Route = require('../classes/Route');

module.exports = class Status extends Route {
  static get path() {
    return '/status';
  }

  static get rootOnly() {
    return true;
  }

  execute(req, res) {
    res.send(this.app.getStatus());
  }
};
