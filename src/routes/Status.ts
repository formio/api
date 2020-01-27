import {Route} from '../classes';

export class Status extends Route {
  get path() {
    return '/status';
  }

  get description() {
    return 'Server status';
  }

  get responses() {
    return {
      200: {
        description: 'Server status',
        content: {
          'text/plain': {
            schema: {
              type: 'string',
              example: '1.0.0',
            },
          },
        },
      },
    };
  }

  public execute(req, res) {
    res.send(this.app.getStatus());
  }
}
