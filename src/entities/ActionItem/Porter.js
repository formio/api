const Porter = require('../../classes/Porter');

module.exports = class ActionItem extends Porter {
  get key() {
    return 'actionitems';
  }

  get noExport() {
    return true;
  }

  get model() {
    return this.app.models.ActionItem;
  }

  getMaps() {
    return Promise.resolve({});
  }

  import(submission) {
    this.mapEntityProperty(submission, 'form', { ...this.maps.forms, ...this.maps.resources });
    return submission;
  }

  export(submission) {
    this.mapEntityProperty(submission, 'form', { ...this.maps.forms, ...this.maps.resources });
    return submission;
  }
};
