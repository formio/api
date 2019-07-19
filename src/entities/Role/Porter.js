const Porter = require('../_portation/Porter');

module.exports = class Role extends Porter {
  get key() {
    return 'roles';
  }

  get model() {
    return this.app.models.Role;
  }

  getMaps(port, query) {
    return super.getMaps(port, query)
      .then(maps => {
        if (port === 'import') {
          maps['everyone'] = '000000000000000000000000';
        }
        else {
          maps['000000000000000000000000'] = 'everyone';
        }
        return maps;
      });
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

  export(document) {
    // Like _.pick()
    const { title, description, admin, default: roleDefault } = document;
    return { title, description, admin, default: roleDefault };
  }
};
