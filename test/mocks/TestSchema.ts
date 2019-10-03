import {Schema} from '../../src/classes/Schema';

export class TestSchema extends Schema {
  get name() {
    return 'test';
  }

  get schema() {
    return {
      _id: this.id,
      data: {},
    };
  }
}
