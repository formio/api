const Porter = require('../../classes/Porter');

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

  public getMaps() {
    return Promise.resolve({});
  }

  public import(submission) {
    this.mapEntityProperty(submission, 'form', { ...this.maps.forms, ...this.maps.resources });
    this.mapEntityProperty(submission, 'roles', this.maps.roles);
    this.mapEntityProperty(submission, 'access', this.maps.roles);
    return submission;
  }

  public export(submission) {
    this.mapEntityProperty(submission, 'form', { ...this.maps.forms, ...this.maps.resources });
    this.mapEntityProperty(submission, 'roles', this.maps.roles);
    this.mapEntityProperty(submission, 'access', this.maps.roles);
    return submission;
  }
};
