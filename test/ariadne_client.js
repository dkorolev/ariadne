'use strict';

var _ = require('underscore');
var assert = require('assert');
var ariadne = require('../lib/ariadne.js');

process.on('uncaughtException', function(error) {
  console.trace(error);
  process.exit(1);
});

var server = ariadne.create({
  thrift: require('./gen-nodejs/AriadneUnitTest.js'),
  types: require('./gen-nodejs/api_types.js')
});

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
