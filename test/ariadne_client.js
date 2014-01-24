// Note: Only one-parameter functions returning value are fully supported.

'use strict';

var ariadne = require('../lib/ariadne.js');

var _ = require('underscore');

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
    if (line.trim().toUpperCase() === 'LOADTEST') {
      var args = new api.types.LoadTestArguments();
      args.before = 'BEFORE';
      args.after = 'AFTER';
      args.left_haand_side = 42;
      var start_time_ms = Date.now();
      var loadtest_duration_ms = 2000;
      var count = 0;
      var done = false;
      var keepGoing = function() {
        server.methods.loadtest(args, function(error, data) {
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
