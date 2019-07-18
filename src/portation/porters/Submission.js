const Porter = require('./Porter');

module.exports = class Submission extends Porter {
  get key() {
    return 'submissions';
  }

  get noExport() {
    return true;
  }

  get model() {
    return this.app.models.Submission;
  }
};
