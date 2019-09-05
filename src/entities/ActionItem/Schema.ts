const Schema = require('../../dbs/Schema');

module.exports = class ActionItem extends Schema {
  get name() {
    return 'actionItem';
  }

  get basePath() {
    return '/form/:formId';
  }

  get schema() {
    return {
      _id: this.id,
      action: {
        type: 'id',
        required: true,
        description: 'The action id that was triggered.',
      },
      title: {
        type: 'string',
          require: true,
      },
      dataType: {
        type: 'string',
        default: 'submission',
        required: true,
      },
      dataId: {
        type: 'id',
        index: true,
        required: false,
      },
      data: {},
      handler: {
        type: 'string',
        require: true,
      },
      method: {
        type: 'string',
        require: true,
      },
      context: {},
      state: {
        type: 'string',
        enum: ['new', 'complete', 'error'],
        required: true,
        default: 'new',
        description: 'The current status of this event.',
      },
      messages: {},
      created: this.created,
      modified: this.modified,
      attempts: {
        type:  'number',
        default: 0,
      },
    };
  }
};
