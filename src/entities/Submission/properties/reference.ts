import {ReferenceHandler} from '../../../classes';

export const reference = (
  component: any,
  __data: any,
  handler: string,
  action: string,
  {path, req, res, app}: any,
) => {
  const referenceHandler = new ReferenceHandler(component, path, req, res, app);

  if (handler !== 'afterValidate' && handler !== 'afterActions') {
    return Promise.resolve();
  }

  switch (action) {
    case 'get':
      return referenceHandler.onGet(handler);
    case 'post':
      return referenceHandler.onPost(handler);
    case 'put':
      return referenceHandler.onPut(handler);
    case 'index':
      return referenceHandler.onIndex(handler);
    default:
      return Promise.resolve();
  }
};
