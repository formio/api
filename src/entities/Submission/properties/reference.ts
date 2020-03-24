import {lodash as _} from '../../../util/lodash';

export const reference = async (
  component: any,
  data: any,
  handler: string,
  action: string,
  {app}: any,
) => {
  if (handler === 'afterValidate' && ['post', 'put', 'patch'].includes(action)) {
    const compValue = _.get(data, component.key);

    if (compValue && compValue._id) {
      // Ensure we only set the _id of the resource.
      _.set(data, component.key, {
        _id: app.db.toID(compValue._id),
      });
    }
  }

  if (handler === 'afterActions') {
    // Loading reference values is in Submission/Resources.ts as loadReferences().
    // This was for performance reasons so they can all be loaded at once instead of individual requests.
  }
};
