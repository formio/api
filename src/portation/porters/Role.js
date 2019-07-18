const Porter = require('./Porter');

module.exports = class Role extends Porter {
  get key() {
    return 'roles';
  }

  get model() {
    return this.app.models.Role;
  }

  cleanUp(roles) {
    // Add everyone role for later reference.
    roles.everyone = {
      _id: '000000000000000000000000'
    };
    return Promise.resolve();
  }

  query(document) {
    return {
      $or: [
        {
          machineName: document.machineName,
          deleted: { $eq: null }
        },
        {
          title: document.title,
          deleted: { $eq: null }
        }
      ]
    };
  }
};
