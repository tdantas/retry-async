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

  retry.success = initialState;
  retry.retry = retry;
  retry.start = start;
  retry.restart = restart;

  return retry;

  function start() {
    started = true;

    if (!enableRetry)
      return connectFn();

    retry();
  }

  function restart() {
    initialState();
    retry();
  }

  function initialState() {
    clearTimeout(timer);
    timer = null;
    iteration = 0;
    lastDelay = 0;
    started = false;
  }

  function retry() {
    if (!started)
        return start();

    // ignore if already has a timer scheduled
    if (timer) return;

    if (!enableRetry || iteration === opts.attempts) {
      return failureFn(iteration);
    }

    lastDelay = delayFn(iteration++, lastDelay, opts.initialValue);
    run(iteration, lastDelay);
  }

  function run(currentIteration, delay) {
    delay = Math.min(opts.maxValue, delay);

    timer = setTimeout(() => {
      clearTimeout(timer); 
      timer = null;
      connectFn(currentIteration, delay);
    }, delay);
  }
}
