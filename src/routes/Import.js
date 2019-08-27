const Route = require('../classes/Route');

module.exports = class Import extends Route {
  get method() {
    return 'post';
  }

  get path() {
    return `${super.path}/import`;
  }

  execute(req, res, next) {
    let template = req.body;
    if (typeof req.body === 'object' && req.body.hasOwnProperty('template')) {
      template = req.body.template;
    }
    if (typeof template === 'string') {
      template = JSON.parse(template);
    }

    this.app.importTemplate(template, req)
      .then(() => {
        res.status(200).send('Ok');
      })
      .catch(next);
  }
};
