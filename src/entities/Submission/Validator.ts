declare global {
  namespace NodeJS {
    // @ts-ignore
    interface Global {
      document: any;
      window: any;
      navigator: any;
      Text: any;
      HTMLElement: any;
      HTMLCanvasElement: any;
    }
  }
}

// Define a few global noop placeholder shims and import the component classes
global.Text              = class {};
global.HTMLElement       = class {};
global.HTMLCanvasElement = class {};

// Workers do not allow define properties below
// They were placed in try / catch to prevent runtime error
try {
  global.navigator         = {
    userAgent: '',
  };
  global.document          = {
    createElement: () => ({}),
    cookie: '',
    getElementsByTagName: () => [],
    documentElement: {
      style: {},
    },
  };
  global.window            = {
    addEventListener: () => ({}),
    Event: {},
    navigator: global.navigator,
  };
} catch (err) {
  // Do nothing if environment throws an error
}

import {Displays, Formio} from 'formiojs/formio.form.js';
import Evaluator from 'formiojs/utils/Evaluator.js';
import * as vm from 'vm';
import {lodash as _} from '../../util/lodash';

Evaluator.evaluator = (func, args) => {
  return () => {
    const params = Object.keys(args);
    const sandbox = vm.createContext({
      result: null,
      args,
    });
    /* eslint-disable no-empty */
    try {
      const script = new vm.Script(`result = (function({${params.join(',')}}) {${func}})(args);`);
      script.runInContext(sandbox, {
        timeout: 250,
      });
    }
    catch (err) {
      // Do nothing.
    }
    /* eslint-enable no-empty */
    return sandbox.result;
  };
};

// Remove onChange events from all displays.
for (const display of Object.keys(Displays.displays)) {
  Displays.displays[display].onChange = () => ({});
}

/**
 * @TODO: Isomorphic validation system.
 *
 * @param form
 * @param model
 * @constructor
 */
export class Validator {
  public model: any;
  public form: any;
  public req: any;
  public token: any;

  constructor(form, model, req) {
    // Wrap the model since formio.js expects a callback function and the server provides a promise.
    this.model = Object.assign(
      Object.create( Object.getPrototypeOf(model)),
      model,
      {
        findOne: async (query: any = {}, next) => {
          // Remove legacy deleted option. (Handled by Model now)
          delete query.deleted;

          // Convert form to ID.
          if (query.form) {
            query.form = this.model.db.toID(query.form);
          }

          try {
            const result = await model.findOne(query, {}, req.context.params);
            next(null, result);
          }
          catch (err) {
            next(err);
          }
        },
      },
  );
    this.form = form;
    this.req = req;
    this.token = req.token;
  }

  /**
   * Validate a submission for a form.
   *
   * @param {Object} submission
   *   The data submission object.
   * @param next
   *   The callback function to pass the results.
   */
  /* eslint-disable max-statements */
  public validate(submission, next) {
    // Skip validation if no data is provided.
    if (!submission.data) {
      return next();
    }

    const unsets = [];
    let unsetsEnabled = false;

    // Create the form, then check validity.
    Formio.createForm(this.form, {
      hooks: {
        setDataValue(value, key, data) {
          if (!unsetsEnabled) {
            return value;
          }
          // Check if this component is not persistent.
          if (this.component.hasOwnProperty('persistent') &&
            (!this.component.persistent || this.component.persistent === 'client-only')
          ) {
            unsets.push({key, data});
          }
          // Check if this component is conditionally hidden and does not set clearOnHide to false.
          else if (
            (!this.component.hasOwnProperty('clearOnHide') || this.component.clearOnHide) &&
            (!this.conditionallyVisible() || !this.parentVisible)
          ) {
            unsets.push({key, data});
          }
          return value;
        },
      },
    }).then((form) => {
      // Set the validation config.
      form.validator.config = {
        db: this.model,
        token: this.token,
        form: this.form,
        submission,
      };

      // Set the submission data
      form.data = submission.data;

      // Perform calculations and conditions.
      form.calculateValue();
      form.checkConditions();

      // Reset the data
      form.data = {};

      // Set the value to the submission.
      unsetsEnabled = true;
      form.setValue(submission, {
        sanitize: true,
      });

      // Check the validity of the form.
      form.checkAsyncValidity(null, true).then((valid) => {
        if (valid) {
          // Clear the non-persistent fields.
          unsets.forEach((unset) => _.unset(unset.data, unset.key));
          submission.data = form.data;
          return next(null, submission.data);
        }

        const details = [];
        form.errors.forEach((error) => error.messages.forEach((message) => details.push(message)));

        // Return the validation errors.
        return next({
          name: 'ValidationError',
          details,
        });
      }).catch(next);
    }).catch(next);
  }
}
