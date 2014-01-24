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
