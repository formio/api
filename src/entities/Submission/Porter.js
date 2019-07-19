const Porter = require('../_portation/Porter');

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

  getMaps() {
    return Promise.resolve({});
  }

  import(submission) {
    this.mapEntityProperty(submission, 'form', { ...this.maps.forms, ...this.maps.resources });
    this.mapEntityProperty(submission, 'roles', this.maps.roles);
    this.mapEntityProperty(submission, 'access', this.maps.roles);
    return submission;
  }

  export(submission) {
    this.mapEntityProperty(submission, 'form', { ...this.maps.forms, ...this.maps.resources });
    this.mapEntityProperty(submission, 'roles', this.maps.roles);
    this.mapEntityProperty(submission, 'access', this.maps.roles);
    return submission;
  }
};
