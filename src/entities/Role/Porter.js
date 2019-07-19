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
        if (port === 'export') {
          maps['000000000000000000000000'] = 'everyone';
        }
        else {
          maps['everyone'] = '000000000000000000000000';
        }
        return maps;
      });
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
