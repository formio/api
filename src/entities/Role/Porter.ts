import {Porter} from '../../classes/Porter';

export class Role extends Porter {
  get key() {
    return 'roles';
  }

  get model() {
    return this.app.models.Role;
  }

  public getMaps(port, query) {
    return super.getMaps(port, query)
      .then((maps) => {
        if (port === 'export') {
          maps['000000000000000000000000'] = 'everyone';
        } else {
          maps.everyone = '000000000000000000000000';
        }
        return maps;
      });
  }

  public query(document: any): any {
    return {
      $or: [
        {
          machineName: document.machineName,
        },
        {
          title: document.title,
        },
      ],
    };
  }

  public export(document) {
    // Like _.pick()
    const { title, description, admin, default: roleDefault } = document;
    return { title, description, admin, default: roleDefault };
  }
}
