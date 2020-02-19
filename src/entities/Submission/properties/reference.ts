import {ReferenceHandler, ReferenceHandlerParams} from './ReferenceHandler';

export const reference = (
  component: any,
  __data: any,
  handler: string,
  action: string,
  {path, req, res, app}: any,
) => {
  if (handler !== 'afterValidate' && handler !== 'afterActions') {
    return Promise.resolve();
  }

  const params: ReferenceHandlerParams = {app, component, path, req, res};

  switch (action) {
    case 'get':
      return ReferenceHandler.onGet(params, handler);
    case 'post':
      return ReferenceHandler.onPost(params, handler);
    case 'put':
      return ReferenceHandler.onPut(params, handler);
    case 'index':
      return ReferenceHandler.onIndex(params, handler);
    default:
      return Promise.resolve();
  }
};
