var _ = require('underscore');
var assert = require('assert');
var step = require('step');
var readline = require('readline');
var express = require('express');
var thrift = require('thrift');

// Ariadne implementation.
// Allows adding hooks for lines from stdin and HTTP endpoints.
function Impl(service, config) {
  assert(_.isObject(service));
  assert(_.isObject(service.thrift));
  assert(_.isObject(service.types));
  this.service = service;

  this.config = config;

  this.log = this.config.verbose ? console.log : function() {};
  assert(_.isObject(config));
  this.stdin_handlers = [];
  this.log('Created Ariadne::Impl().');
};

// Adds an stdin line handler.
// Stdin handlers are functions invoked first to last.
// Returning true results in no further handlers being invoked for this line.
Impl.prototype.addStdinHandler = function(f) {
  assert(_.isFunction(f));
  this.stdin_handlers.push(f);
};

// Runs Ariadne.
// Handles input from stdin and HTTP requests.
Impl.prototype.run = function(callback) {
  var url_regex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  var prefix_url = '/api/';
  // Wraps web links and links reflecting other API calls into <a href> tags.
  function addAHrefToUrls(object) {
    function dfs(o) {
      for (var i in o) {
        if (o.hasOwnProperty(i)) {
          if (_.isString(o[i])) {
            if (url_regex.test(o[i]) || o[i].substr(0, prefix_url.length) === prefix_url) {
              var a = o[i];
              if (o.hasOwnProperty(i + '_name')) {
                a = o[i + '_name'];
                delete o[i + '_name'];
              }
              o[i] = "<a href='" + o[i] + "'>" + a + "</a>";
            }
          } else if (_.isObject(o[i])) {
            dfs(o[i]);
          }
        }
      }
    };
    dfs(object);
  };
  // A helper function to serve JSON as plain text to curl and formatted for the browser.
  function serveFunctionAsJson(source) {
    return function(request, response) {
      var result = source();
      response.format({
        text: function() {
          response.send(JSON.stringify(result));
        },
        html: function() {
          addAHrefToUrls(result);
          response.send('<pre>' + JSON.stringify(result, null, 2) + '</pre>');
        },
      });
    };
  };

  var impl = this;

  function stdinHandler(line) {
    console.log('INITIALIZING');
  };
  step(
    function setupTearDownHook(error) {
      if (error) throw error;
      var self = this;
      process.on('SIGINT', function() {
        impl.log('SIGINT, tearing down.');
        impl.tearDown(function() {
          impl.log('SIGINT, tearing down: Done.');
          process.exit(0);
        });
      });
      self();
    },

    function stepStartReadline(error) {
      if (error) throw error;
      var self = this;
      // Need a wrapper to allow overriding stdinHandler() later.
      readline.createInterface({
        input: process.stdin,
        output: false
      }).on('line', function(line) {
        stdinHandler(line);
      });
      self();
    },

    function createThriftConnection(error) {
      if (error) throw error;
      var self = this;

      impl.log('Thrift connection to ' + impl.config.host + ':' + impl.config.port);
      impl.thrift_connection = thrift.createConnection(impl.config.host, impl.config.port);

      impl.thrift_connection.on('error', function(error) {
        console.trace(error);
        console.error('Thrift connection error. Check whether the backend server is running.');
        process.exit(1);
      });

      impl.thrift_connection.on('connect', self);
    },

    function respectStartupDelay(error) {
      if (error) throw error;
      var self = this;
      setTimeout(self, impl.config.startup_delay_ms || 0);
    },

    function startHandlingRequests(error) {
      if (error) throw error;
      var self = this;
      stdinHandler = function(line) {
        for (var i in impl.stdin_handlers) {
          if (impl.stdin_handlers[i](line)) {
            return;
          }
        }
        impl.log('No stdin handler for line: ' + line);
      };
      // TODO(dkorolev): Add HTTP endpoints as well.
      self();
    },

    function createThriftClient(error) {
      if (error) throw error;
      var self = this;
      var thrift_client = thrift.createClient(impl.service.thrift, impl.thrift_connection);
      self();
    },

    function initializeExpress(error) {
      if (error) throw error;
      var self = this;
      var app = express();
      app.use(express.bodyParser());
      var i = 0;
      function statusz() {
        return {
          value: ++i
        };
      };
      app.get('/', serveFunctionAsJson(statusz));
      app.listen(impl.config.fe_port);
      self();
    },

    function initDone() {
      if (_.isFunction(callback)) {
        callback();
      }
    }); // step().
};

Impl.prototype.tearDown = function(callback) {
  assert(_.isFunction(callback));
  var self = this;
  if (self.thrift_connection) {
    self.thrift_connection.on('close', function() {
      delete self.thrift_connecton;
      callback();
    });
    self.thrift_connection.end();
  }
};

module.exports = {
  // Registers Ariadne-specific command line flags.
  registerFlags: function(passed_in_commander) {
    var commander = passed_in_commander || require('commander');
    commander.option('-h, --host [host]', 'The host running the Thrift server.', 'localhost');
    commander.option('-p, --port [port]', 'The port on which Thrift server is running.', 9090);
    commander.option('-fe, --fe_port [port]', 'The port on which HTTP server should be spawned.', 9091);
    commander.option('-v, --verbose', 'Dump debugging information.');
    commander.option('--startup_delay_ms [ms]', 'The wait before Ariande starts serving. For debugging purposes.');
  },

  // Starts Ariadne assuming the flags have been registered before and the command line has been parsed.
  createAriadne: function(service, flags) {
    // Required parameters are Thrift interface and types definition. Ref. the test:
    // var server = ariadne.create({
    //   thrift: require('./gen-nodejs/AriadneUnitTest.js'),
    //   types: require('./gen-nodejs/api_types.js')
    // });
    assert(_.isObject(service));
    assert(_.isObject(service.thrift));
    assert(_.isObject(service.types));
    return new Impl(service, flags || require('commander'));
  },

  // Starts Ariadne with no strings attached.
  create: function(service) {
    // Required parameters are Thrift interface and types definition. Ref. the test:
    // var server = ariadne.create({
    //   thrift: require('./gen-nodejs/AriadneUnitTest.js'),
    //   types: require('./gen-nodejs/api_types.js')
    // });
    assert(_.isObject(service));
    assert(_.isObject(service.thrift));
    assert(_.isObject(service.types));
    var commander = require('commander');
    commander.version(require('../package.json').version);
    this.registerFlags(commander);
    commander.parse(process.argv);
    return this.createAriadne(service, commander);
  }
};
