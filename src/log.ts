import debug from 'debug';

export const log = (type, ...args) => {
  const types = {
    debug: debug('formio:debug'),
    error: debug('formio:error'),
    info: debug('formio:info'),
    warning: debug('formio:warning'),
    audit: debug('formio:audit'),
  };

  // If type is not passed in.
  if (!types.hasOwnProperty(type)) {
    args.unshift(type);
    type = 'info';
  }

  types[types.hasOwnProperty(type) ? type : 'error'](...args);
};
