import Utils from 'formiojs/utils';
import * as vm from 'vm';

Utils.Evaluator.noeval = true;
Utils.Evaluator.evaluator = (func, args) => {
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
      // Swallow error.
    }
    /* eslint-enable no-empty */
    return sandbox.result;
  };
};
export const formio = Utils;
