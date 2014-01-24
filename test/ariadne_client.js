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
    var x = line.match(/^\s*(\d+)\s+(\d+)\s*$/);
    if (x) {
      console.log(Number(x[1]) + Number(x[2]));
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
    if (line.trim().toUpperCase() === 'TESTCALL') {
      var args = new api.types.AddArguments();
      args.left_hand_side = 100;
      args.right_hand_side = 42;
      server.methods.add(args, function(error, data) {
        if (error) throw error;
        console.log(JSON.stringify(data));
      });
      return true;
    }
  });

server.STDIN_LINE(
  function(line) {
    console.log('UNRECOGNIZED');
    return true;
  });

server.GET('/demo', function() {
  return {
    test: 'passed',
    url: 'http://google.com'
  }
});

server.GET('/beauty', function() {
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
