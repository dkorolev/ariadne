// Easy ways to run this code:
// 1) echo PERF_TEST | node ariadne_client.js --server_command "node thrift_server.js"
// 2) echo ASYNC_TEST | node ariadne_client.js --server_command "node thrift_server.js"
// 3) (cd c++; make) && echo ASYNC_TEST | node ariadne_client.js --server_command c++/binary
// 4) ./run_test.sh

// Note: Only one-parameter functions returning value are fully supported.

'use strict';

var ariadne = require('../lib/ariadne.js');

var _ = require('underscore');
var in_words = require('in-words');

var api = {
  thrift: require('./gen-nodejs/AriadneUnitTest.js'),
  types: require('./gen-nodejs/api_types.js')
};

process.on('uncaughtException', function(error) {
  console.trace(error);
  process.exit(1);
});

var server = ariadne.create(api);

server.STDIN_LINE(
  function(line) {
    var sum_arguments = line.match(/^\s*(\d+)\s+(\d+)\s*$/);
    if (sum_arguments) {
      console.log(Number(sum_arguments[1]) + Number(sum_arguments[2]));
      return true;
    }
  });

server.STDIN_LINE(
  function(line) {
    if (line.trim().toUpperCase() === 'STOP') {
      server.tearDown(function() {
        process.exit(0);
      });
      return true;
    }
  });

server.STDIN_LINE(
  function(line) {
    if (line.trim().toUpperCase() === 'PERF_TEST') {
      var args = new api.types.PerfTestArguments();
      args.before = 'BEFORE';
      args.after = 'AFTER';
      args.left_haand_side = 42;
      var start_time_ms = Date.now();
      var loadtest_duration_ms = 2000;
      var count = 0;
      var done = false;
      var keepGoing = function() {
        server.methods.perf_test(args, function(error, data) {
          if (error) throw error;
          var result = data.split(' ');
          if (result.length !== 3 || result[0] !== args.before || result[2] !== args.after) {
            console.error('Test failed.');
            process.exit(1);
          }
          ++count;
          var ms = Date.now();
          if (ms >= start_time_ms + loadtest_duration_ms) {
            if (!done) {
              done = true;
              console.log((count / (1e-3 * (ms - start_time_ms))).toFixed(1) + ' qps');
            }
          } else {
            if (true) {
              keepGoing();
            } else {
              // Tested: Results in ~8x less QPS.
              setTimeout(keepGoing, 0);
            }
          }
        });
      };
      keepGoing();
      return true;
    }
  });

server.STDIN_LINE(
  function(line) {
    if (line.trim().toUpperCase() === 'ASYNC_TEST') {
      for (var i = 1; i <= 10; ++i) {
        (function(i) {
          var args = new api.types.AsyncTestArguments();
          args.value = in_words.en(i);
          args.delay_ms = 500 + i * 100;
          console.log(JSON.stringify(args));
          console.log(server.methods.async_test(args, function(error, data) {
            if (error) throw error;
            console.log(data);
          }));
        })(i);
      }
      return true;
    }
  });

server.GET('/demo', function() {
  return {
    test: 'passed',
    url: 'http://google.com'
  }
});

server.GET('/', function() {
  return {
    beautifier: 'unittest',
    caption: 'Beauty',
    value: 42
  }
});

server.addBeautifier('unittest', function(o, callback) {
  callback('<h1>' + o.caption + '</h1>\n<p>' + o.value + '</p>');
});

server.run(function() {
  console.log('STARTED');
});
