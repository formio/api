import {Form} from '../Form/Porter';

export class Resource extends Form {
  get key() {
    return 'resources';
  }

  public getMaps(port, query = { type: 'resource' }) {
    return super.getMaps(port, query);
  }
}
