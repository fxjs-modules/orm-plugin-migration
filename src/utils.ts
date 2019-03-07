import _       = require('lodash');
import Promise = require('bluebird');

export function addPromiseInterface(
  originalMethod: <T = any>(callback: (err: any, result?: T) => void) => void
) {
  return function() {
    const ctx = this;

    const cb = _.last(arguments);
    if(typeof cb === "function") {
      return originalMethod.apply(ctx, arguments);
    } else {
      return Promise.promisify(originalMethod).apply(ctx, arguments);
    }
  }
}