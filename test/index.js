const Retry = require('../');
const assert = require('assert');

function delay(fn, times) {
  var count = 1;
  return function() {
    if (count < times) return count++;
    fn();
  }
}

describe('postpone', () => {

  function delayFn(iteration) { return 1; }

  it('defaults 3 times the retry', (done) => {
    const retry = Retry(connect, verify, { delayFn: delayFn });

    var times = 0;
    function connect(iteration, delay) {
      times++;
      assert(times <= 4, 'never more than 3 times');
      retry();
    }

    function verify(iteration) {
      assert.equal(times, 4)
      assert.equal(iteration, 3)
      done();
    }
    
    retry.start();
  });

  it('respect the attempts parameter', (done) => {
    const retry = Retry(connect, verify, { delayFn: delayFn, attempts: 5});
    var times = 0;

    function connect(iteration, delay) {
      times++;
      assert(times <= 6, 'never more than 6 times');
      retry();
    }

    function verify(iteration) {
      assert.equal(iteration,5)
      done();
    }
    
    retry.start();
  });
  
  it('ignore duplicate retrys', (done) => {
    var done = delay(done, 2);
    const retry = Retry(connect, verify, { delayFn: delayFn });
    
    function connect(iteration, delay) {
      retry();
      retry();
    }

    function verify(iteration) {
      assert.equal(iteration, 3);
      done();
    }
    
    retry();
  });

  it('restart retry state after finish with success', (done) => {
    const retry = Retry(connect, verify, { delayFn: delayFn });
    var times = 0;
    
    function connect(iteration, delay) { 
      times++;

      if (times === 1) { 
        retry.success(); // success
        return setImmediate(() => { retry() });
      }

      retry();
    }

    function verify(iteration) {
      assert.equal(times, 5);
      assert.equal(iteration, 3);
      done();
    }

    retry();
  });

  it('restart retry state', (done) => {
    const retry = Retry(connect, verify, { delayFn: delayFn });
    var fail = false;
    
    function connect(iteration, delay) { retry(); }

    function verify(iteration) {
      assert.equal(iteration, 3);

      if (!fail) { 
        fail = true;
        return retry.restart();
      }

      if (fail)
        done();
    }

    retry();
  });

  
  it('has default delayFn', (done) => {
    const retry = Retry(connect, () => done() , { attempts: 2, initialValue: 10 });
    var delayOne;
    
    function connect(iteration, delay) { 
      if (iteration == 0) {
        return retry();
      }
      
      if (iteration == 1) {
        delayOne = delay;
        return retry();
      }

      if (iteration == 2) {
        assert(delayOne < delay);
        retry.success();
        return setImmediate(done);
      }

      assert(false, 'should never be here');
    }

    retry();
  });

  it('use maxValue if delayFn return a greater value', (done) => {
    const retry = Retry(connect, verify , { 
      attempts: 10, 
      delayFn: () => { return 60e3; }, 
      maxValue: 10 
    });

    const start = Date.now();
    retry();

    function connect(iteration, delay) { retry(); }

    function verify(attempt) {
      const diff = Date.now() - start;
      assert(diff < 200);
      done();
    }
  });

  it('does not interfer with two or more retry functions', (done) => {
    var verify = delay(verify, 2);
    const retryOne = Retry(connectOne, verify, { delayFn, attempts: 4 });
    const retryTwo = Retry(connectTwo, verify, { delayFn, attempts: 6 });

    var times = 0;
    
    function connectOne(iteration, delay) { times++; retryOne() };
    function connectTwo(iteration, delay) { times++; retryTwo(); }

    function verify(iteration) {
      // 2 initial start + 10 retry
      const total = 2 + 10;
      assert.equal(times, total);
      done();
    }

    retryOne(); retryTwo();
  });

  it('will call immediately the connect when reconnect is false', (done) => {
    const retry = Retry(connect, verify, false);
    var times = 0;

    function connect() { 
      if (times > 0) assert(false);
      times++; 
      setImmediate(() => {
        assert.equal(times, 1);
        done(); 
      });
    }
   
    function verify() { assert(false, 'never be here'); }

    retry.start();
  });

  it('will call immediately the connect when reconnect is false [function interface]', (done) => {
    const retry = Retry(connect, verify, false);
    var times = 0;

    function connect() { 
      if (times > 0) assert(false);
      times++; 
      assert.equal(times, 1);
      done(); 
    } 
   
    function verify() { assert(false, 'never be here'); }

    retry();
  });


  
  it('fails when call retry with false', (done) => {
    const retry = Retry(connect, verify, false);
    var times = 0;

    function connect() { retry(); }
   
    function verify(iteration) {
      assert.equal(iteration, 0);
      done();
    }

    retry.start();
  });


});
