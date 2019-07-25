const Route = require('../classes/Route');

module.exports = class Export extends Route {
  static get path() {
    return 'export';
  }

  execute(req, res, next) {
    this.app.exportTemplate()
      .then((result) => {
        res.status(200).send(result);
      })
      .catch(next);
  }
};
