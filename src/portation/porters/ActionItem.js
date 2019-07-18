const Porter = require('./Porter');

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
};
