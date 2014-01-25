// TODO(dkorolev): Add sequential calls buffer. Like server.buffered_methods along with server.methods.
// Focus on performace, keep emptying buffer in the "main thread", invoking callbacks using setTimeout(0).
//
// TODO(dkorolev): Add a KEEPALIVE Thrift endpoint that Ariadne will be polling.

// Note: Only one-parameter functions returning value are fully supported. Please see the test.

'use strict';

var _ = require('underscore');
var assert = require('assert');
var step = require('step');
var readline = require('readline');
var express = require('express');
var thrift = require('thrift');
var child_process = require('child_process');

var ariadne_version = require('../package.json').version;

// Ariadne implementation.
// Allows adding hooks for lines from stdin and HTTP endpoints.
function Impl(service, config) {
  assert(_.isObject(service));
  assert(_.isObject(service.thrift));
  assert(_.isObject(service.types));
  this.service = service;

  this.config = config;
  this.start_time_ms = Date.now();
  this.stats = {
    stdin_lines: 0,
    http_requests: 0,
    http_requests_by_method: {}
  };
  this.status = 'INITIALIZING';

  this.log = this.config.verbose ? console.log : function() {};
  assert(_.isObject(config));
  this.stdin_handlers = [];
  this.http_handlers = [];
  this.html_beautifiers = {};
  this.buffer = [];
  this.flushing = false;
  this.log('Created Ariadne::Impl().');
};

// Keeps pushing entries to the server.
// Does so in the loop swapping two arrays: one being sent to the server, one populated by the client.
Impl.prototype.keepFlushingOutgoingBuffer = function() {
  var impl = this;
  if (impl.flushing) {
    return;
  }
  impl.flushing = true;
  var chunk = [];
  var go = function(i) {
    if (i < chunk.length) {
      var e = chunk[i];
      impl.thrift_client[e.method].call(impl.thrift_client, e.argument, function(error, data) {
        if (error) throw error;
        e.callback(null, data);
        e = null;
        go(i + 1);
      });
    } else {
      if (impl.buffer.length > 0) {
        chunk = impl.buffer;
        impl.buffer = [];
        go(0);
      } else {
        impl.flushing = false;
      }
    }
  };
  go(0);
};

// Returns uptime statistics in various units.
Impl.prototype.uptimeStats = function() {
  var in_ms = Date.now() - this.start_time_ms;
  var in_seconds = 1e-3 * in_ms;
  var in_minutes = in_seconds / 60;
  var in_hours = in_minutes / 60;
  var in_days = in_hours / 24;
  return {
    in_seconds: Math.floor(in_seconds),
    in_minutes: Math.floor(in_minutes),
    in_hours: Math.floor(in_hours),
    in_days: Math.floor(in_days),
  };
};

// Adds an stdin line handler.
// Stdin handlers are functions invoked first to last.
// Returning true results in no further handlers being invoked for this line.
Impl.prototype.STDIN_LINE = Impl.prototype.stdin_line = function(handler) {
  assert(_.isFunction(handler));
  this.stdin_handlers.push(handler);
};

// Adds an HTTP handler.
// The function should return an object.
// Before being output, the object will be beautified accordingly by Ariadne.
Impl.prototype.HTTP = function(method, endpoint, handler) {
  assert(_.isString(method));
  assert(_.isString(endpoint));
  assert(_.isFunction(handler));
  this.http_handlers.push({
    method: method,
    endpoint: endpoint,
    handler: handler
  });
};

function createHttpHandler(name, method) {
  Impl.prototype[name] = function(endpoint, handler) {
    assert(_.isString(endpoint));
    assert(_.isFunction(handler));
    this.HTTP('get', endpoint, handler);
  };
};
createHttpHandler('GET', 'get');
createHttpHandler('POST', 'post');
createHttpHandler('get', 'get');
createHttpHandler('post', 'post');

// Adds a beautifier.
// In current implementation, beautifier "x" is invoked for HTML outputs
// for objects that have { beautifier: "x" } field at the top level.
// The beautifier itself if the function that takes two parameters:
// * The object to beautify.
// * The callback that should be called with the beautified string being the only parameter.
Impl.prototype.BEAUTIFY = Impl.prototype.addBeautifier = function(c, beautifier) {
  if (this.html_beautifiers.hasOwnProperty(c)) {
    console.error('Beautifier "' + c + '" has already been defined.');
    process.exit(1);
  }
  this.html_beautifiers[c] = beautifier;
};

// Runs Ariadne.
// Handles input from stdin and HTTP requests.
Impl.prototype.run = function(callback) {
  var url_regex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  var prefix_rpc = 'ariadne_';
  var prefix_url = '/ariadne/';

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

  var impl = this;

  // A helper function to serve JSON as plain text to curl and formatted for the browser.
  function sendFormattedResponse(response, data) {
    response.format({
      text: function() {
        if (_.isObject(data)) {
          response.send(JSON.stringify(data));
        } else {
          response.send(String(data));
        }
      },
      html: function() {
        if (_.isObject(data)) {
          if (data.beautifier && impl.html_beautifiers.hasOwnProperty(data.beautifier)) {
            impl.html_beautifiers[data.beautifier](data, response.send.bind(response));
          } else {
            addAHrefToUrls(data);
            response.send('<pre>' + JSON.stringify(data, null, 2) + '</pre>');
          }
        } else {
          response.send(String(data));
        }
      },
    });
  };

  function constructObjectServer(source) {
    return function(request, response) {
      var result = source();
      assert(_.isObject(result) || _.isString(result) || _.isNumber(result));
      sendFormattedResponse(response, result);
    };
  };

  step(
    function setupTearDownHook(error) {
      if (error) throw error;
      var self = this;
      process.on('exit', function() {
        impl.log('Tearing down via process.on("exit").');
        impl.tearDown(function() {
          impl.log('Tearing down via process.on("exit"): Done.');
          process.exit(0);
        });
      });
      // Unnecessary, but keep for extra safety.
      process.on('SIGINT', function() {
        impl.log('Tearing down via process.on("SIGINT").');
        impl.tearDown(function() {
          impl.log('Tearing down via process.on("SIGINT"): Done.');
          process.exit(0);
        });
      });
      self();
    },

    function stepStartExpress(error) {
      if (error) throw error;
      var self = this;
      impl.express = express();
      impl.express.use(express.json());
      impl.express.all('*', function(request, result, next) {
        ++impl.stats.http_requests;
        var method = request.method;
        if (_.isNumber(impl.stats.http_requests_by_method[method])) {
          ++impl.stats.http_requests_by_method[method];
        } else {
          impl.stats.http_requests_by_method[method] = 1;
        }
        next();
      });
      impl.express.get('/ariadne/impl/healthz', constructObjectServer(function() {
        return 'OK';
      }));
      impl.express.get('/ariadne/impl/status', constructObjectServer(function() {
        return {
          ariadne_version: ariadne_version,
          status: impl.status,
        };
      }));
      impl.express.get('/ariadne/impl/uptime', constructObjectServer(function() {
        return {
          ariadne_version: ariadne_version,
          uptime: impl.uptimeStats(),
        };
      }));
      impl.express.get('/ariadne/impl/stats', constructObjectServer(function() {
        return {
          ariadne_version: ariadne_version,
          stats: impl.stats,
        };
      }));
      var methodsList = function() {
        return {
          methods: _.functions(impl.methods)
        };
      };
      impl.express.get('/ariadne/impl/methods', constructObjectServer(function() {
        return {
          methods: _.functions(impl.methods),
          types: _.functions(impl.service.types),
        };
      }));
      impl.express.get('/ariadne/impl/', constructObjectServer(function() {
        return {
          ariadne_version: ariadne_version,
          status: impl.status,
          uptime: impl.uptimeStats(),
          stats: impl.stats,
          endpoints: {
            healthz: '/ariadne/impl/healthz',
            status: '/ariadne/impl/status',
            uptime: '/ariadne/impl/uptime',
            stats: '/ariadne/impl/stats',
            methods: '/ariadne/impl/methods',
          },
        };
      }));
      impl.express.listen(impl.config.fe_port);
      self();
    },

    function stepStartServerIfNecessary(error) {
      if (error) throw error;
      var self = this;

      if (impl.config.connect_to_existing) {
        self();
      } else {
        impl.status = 'STATING_SERVER';
        impl.log('Starting server as "' + impl.config.server_command + '".');
        assert(impl.config.server_command);
        impl.child = child_process.spawn('bash', ['-c', impl.config.server_command]);
        impl.child.on('close', function(code) {
          // Prevent 'impl.child' from being garbage collected or killed after it exited.
          impl.terminated_child = impl.child;
          delete impl.child;
          impl.log('Terminating with code ' + code + ' since the spawned server has terminated with it.');
          process.exit(code);
        });
        impl.status = 'WAITING_FOR_SERVER';
        impl.log('Waiting for the server to print "READY".');
        readline.createInterface({
          input: impl.child.stdout,
          output: false
        }).on('line', function(line) {
          if (line.trim().toUpperCase() === 'READY') {
            impl.status = 'SERVER_STARTED';
            impl.server_started = true;
            impl.log('Received "READY" from the server.');
            self();
          } else {
            impl.log('stdout: ' + line);
          }
        });
        readline.createInterface({
          input: impl.child.stderr,
          output: false
        }).on('line', function(line) {
          impl.log('stderr: ' + line);
        });
        setTimeout(function() {
          if (!impl.server_started) {
            impl.status = 'SERVER_START_FAILURE';
            impl.log('Did not received "READY" from the server within ' + impl.config.server_ready_timeout_ms + ' ms.');
            process.exit(1);
          }
        }, impl.config.server_ready_timeout_ms);
      }
    },

    function stepCreateThriftConnection(error) {
      if (error) throw error;
      var self = this;

      impl.log('Thrift connection to ' + impl.config.host + ':' + impl.config.port);
      impl.thrift_connection = thrift.createConnection(impl.config.host, impl.config.port);

      // Identical to:
      // impl.thrift_connection = thrift.createConnection(impl.config.host, impl.config.port, {
      //   transport: thrift.TBufferedTransport,
      //   protocol: thrift.TBinaryProtocol,
      // });

      impl.thrift_connection.on('error', function(error) {
        console.trace(error);
        console.error('Thrift connection error. Check whether the backend server is running.');
        process.exit(1);
      });

      impl.status = 'CONNECTING_THRIFT';
      impl.log('Waiting for Thrift to connect.');

      impl.thrift_connection.on('connect', self);
    },

    function stepCreateThriftClient(error) {
      if (error) throw error;
      var self = this;
      impl.status = 'CREATING_THRIFT_CLIENT';
      impl.log('Thrift connected, creating Thrift client.');
      impl.thrift_client = thrift.createClient(impl.service.thrift, impl.thrift_connection);
      self();
    },

    function stepStartReadline(error) {
      if (error) throw error;
      var self = this;
      impl.status = 'THRIFT_CLIENT_CREATED';
      impl.log('Thrift client created.');
      self();
    },

    function stepStartReadline(error) {
      if (error) throw error;
      var self = this;
      readline.createInterface({
        input: process.stdin,
        output: false
      }).on('line', function(line) {
        ++impl.stats.stdin_lines;
        for (var i in impl.stdin_handlers) {
          if (impl.stdin_handlers[i](line)) {
            return;
          }
        }
        impl.log('No stdin handler for line: ' + line);
      });
      self();
    },

    function stepRegisterEndpoints(error) {
      if (error) throw error;
      var self = this;
      var i = 0;

      for (var i in impl.http_handlers) {
        var h = impl.http_handlers[i];
        impl.express[h.method](h.endpoint, constructObjectServer(h.handler));
      }
      self();
    },

    function stepRegisterThriftApiEndpoints(error) {
      if (error) throw error;
      var self = this;

      function constructThriftEndpointHandler(name) {
        return function(request, response, next) {
          var ok = false;
          var query = (request.hasOwnProperty('query') && _.isObject(request.query) && request.query.hasOwnProperty('_') && _.isString(request.query._)) ? request.query : {};
          var input_type = request.query._ || 'Void'; // Relies on type 'Void' being defined in the proto.
          if (impl.service.types.hasOwnProperty(input_type)) {
            var argument = new impl.service.types[input_type]();
            for (var i in request.query) {
              if (i !== '_') {
                argument[i] = request.query[i];
              }
            }
            impl.methods[name](argument, function(error, data) {
              if (error) {
                console.log(error);
                process.exit(1);
              } else {
                sendFormattedResponse(response, data);
              }
            });
            ok = true;
          } else {
            // If no type was supplied and 'Void' is not defined, return 'PARAMETER_REQUIRED'.
            response.send(500, 'PARAMETER_REQUIRED');
          }
        };
      };

      impl.methods = {};
      _.each(_.functions(impl.thrift_client), function(name) {
        if (name.substr(0, prefix_rpc.length) === prefix_rpc) {
          var method_name = name.substr(prefix_rpc.length);
          var endpoint_name = prefix_url + method_name;
          impl.log('Exporting methhod "[ariadne_]' + method_name + '" via endpoint "' + endpoint_name + '".');
          if (false) {
            // The implementation I am working with now does not seem to handle concurrent calls well,
            // at least from a node.js client using npm install thrift --- D.K.
            impl.methods[method_name] = function(argument, callback) {
              assert(_.isFunction(callback));
              impl.thrift_client[name].call(impl.thrift_client, argument, callback);
            };
          } else {
            impl.methods[method_name] = function(argument, callback) {
              assert(argument);
              assert(_.isFunction(callback));
              impl.buffer.push({
                method:name,
                argument: argument,
                callback: callback,
              });
              impl.keepFlushingOutgoingBuffer();
            }
          };
          impl.express.get(endpoint_name, constructThriftEndpointHandler(method_name));
        }
      });

      impl.status = 'READY';

      self();
    },

    function stepDone() {
      if (_.isFunction(callback)) {
        callback();
      }
    }); // step().
};

// Gracefully shuts down Ariadne.
// TODO(dkorolev): Investigate why C++ server still prints "TSimpleServer client died: No more data to read."
Impl.prototype.tearDown = function(callback) {
  assert(_.isFunction(callback));
  var impl = this;
  step(
    function stepTerminateChildProcessIfNecessary() {
      // Terminate the child process first.
      // It may look counterintuitive, but stepEndThriftConnectionIfNecesary() may not get
      // to the next callback in step(), and cleaning up a potentially spawned server
      // is more important.
      if (impl.child) {
        impl.log('Killing the server.');
        impl.child.kill();
        // Prevent 'impl.child' from being garbage collected or killed twice.
        impl.orphan = impl.child;
        delete impl.child;
      }
      self();
    },
    function stepEndThriftConnectionIfNecesary() {
      var self = this;
      if (impl.thrift_connection) {
        impl.thrift_connection.on('close', function() {
          delete impl.thrift_connecton;
          self();
        });
        impl.thrift_connection.end();
      } else {
        self();
      }
    },
    callback);
};

module.exports = {
  // Registers Ariadne-specific command line flags.
  registerFlags: function(passed_in_commander) {
    var commander = passed_in_commander || require('commander');
    commander.option('-h, --host [host]', 'The host running the Thrift server.', 'localhost');
    commander.option('-p, --port [port]', 'The port on which Thrift server is running.', 9090);
    commander.option('-w, --fe_port [port]', 'The port on which HTTP server should be spawned.', 9091);
    commander.option('-s, --server_command [command]', 'The command to start the Thrift server to work with.');
    commander.option('--server_ready_timeout_ms [ms]', 'Maximum time to wait for "READY" from the server.', 1000);
    commander.option('-e, --connect_to_existing', 'Connect to an existing Thrift service.');
    commander.option('-v, --verbose', 'Dump debugging information.');
  },

  // Starts Ariadne assuming the flags have been registered before and command line has been parsed.
  createAriadne: function(service, flags) {
    // Required parameters are Thrift interface and types definition. Ref. the test:
    // var server = ariadne.create({
    //   thrift: require('./gen-nodejs/AriadneUnitTest.js'),
    //   types: require('./gen-nodejs/api_types.js')
    // });
    assert(_.isObject(service));
    assert(_.isObject(service.thrift));
    assert(_.isObject(service.types));
    if (_.isUndefined(flags.server_command) === _.isUndefined(flags.connect_to_existing)) {
      console.error('Exactly one of --server_command or --connect_to_existing should be set.');
      process.exit(1);
    }
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
    commander.version(ariadne_version);
    this.registerFlags(commander);
    commander.parse(process.argv);
    return this.createAriadne(service, commander);
  }
};
