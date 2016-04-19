const assert = require('assert');
const _ = require('lodash');

module.exports = RetryAsync;

function exponential(value) {
  return value * 2;
}

const defaultOpts = {
  initialValue: 300, // 100ms
  maxValue: 3000, // 3s
  attempts: 3, // 3 attempts
  delayFn: exponential
};

function RetryAsync(connectFn, failureFn, options) {
  assert(typeof connectFn === 'function', 'you must pass the function to be called');
  assert(typeof failureFn === 'function', 'you must pass the function to be called');
  var enableRetry = true;

  if (_.isBoolean(options))
    enableRetry = options;

  const opts = _.defaults(options, defaultOpts);
  
  if (enableRetry)
    assert(opts.attempts > 0, 'attempts must be greater than 0');
  
  var timer;
  var iteration;
  var lastDelay;
  var started;
  
  initialState(); // clearTimeout and set iteration to 0;

  const delayFn = opts.delayFn;

  entryPoint.success = initialState;
  entryPoint.retry = entryPoint.start = start;
  entryPoint.restart = restart;

  return entryPoint;

  function entryPoint() {
    entryPoint.retry();
  } 

  function start() {
    run(iteration, 0);
    entryPoint.retry = retry;
    entryPoint.start = retry;
  }

  function restart() {
    initialState();
    retry();
  }

  function initialState() {
    clearTimeout(timer);
    timer = null;
    iteration = 0;
    lastDelay = opts.initialValue ;
    entryPoint.retry = entryPoint.start = start;
  }

  function retry() {
    // ignore if already has a timer scheduled
    if (timer) return;

    if (!enableRetry || iteration === opts.attempts) {
      return failureFn(iteration);
    }

    lastDelay = delayFn(lastDelay, iteration++, opts.initialValue);
    run(iteration, Math.min(opts.maxValue, lastDelay));
  }

  function run(currentIteration, delay) {
    timer = setTimeout(() => {
      clearTimeout(timer); 
      timer = null;
      connectFn(currentIteration, delay);
    }, delay);
  }
}
