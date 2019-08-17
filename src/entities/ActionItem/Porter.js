const Porter = require('../../classes/Porter');

module.exports = class ActionItem extends Porter {
  get key() {
    return 'actionitems';
  }

  get noExport() {
    return true;
  }

  get model() {
    return this.router.models.ActionItem;
  }

  getMaps() {
    return Promise.resolve({});
  }

  import(submission) {
    this.mapEntityProperty(submission, 'entity', { ...this.maps.forms, ...this.maps.resources });
    return submission;
  }

  export(submission) {
    this.mapEntityProperty(submission, 'entity', { ...this.maps.forms, ...this.maps.resources });
    return submission;
  }
};
