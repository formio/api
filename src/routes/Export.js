const Route = require('../classes/Route');

module.exports = class Export extends Route {
  get path() {
    return `${super.path}/export`;
  }

  execute(req, res, next) {
    this.app.exportTemplate(req)
      .then((result) => {
        res.status(200).send(result);
      })
      .catch(next);
  }
};
