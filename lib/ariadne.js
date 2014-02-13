// Note: Only one-parameter functions returning value are fully supported. Please see the test.

'use strict';

var _ = require('underscore');
var assert = require('assert');
var step = require('step');
var readline = require('readline');
var express = require('express');
var thrift = require('thrift');
var Int64 = require('node-int64');
var child_process = require('child_process');

var ariadne_version = require('../package.json').version;

function un_int64_ify_buffer(buffer) {
  return Number((new Int64(new Buffer(buffer))));
};

function un_int64_ify(object) {
  function dfs(o) {
    for (var i in o) {
      if (o.hasOwnProperty(i)) {
        if (_.isObject(o[i]) && o[i].hasOwnProperty('buffer')) {
          o[i] = un_int64_ify_buffer(o[i].buffer);
        } else if (_.isObject(o[i])) {
          dfs(o[i]);
        }
      }
    }
  };
  if (_.isObject(object)) {
    dfs(object);
  }
  return object;
};


function int64_ify(object) {
  function dfs(o) {
    for (var i in o) {
      if (o.hasOwnProperty(i)) {
        if (i.substr(0, 4) === 'i64_') {
          o[i] = new Int64(Number(o[i]));
        } else if (_.isObject(o[i])) {
          dfs(o[i]);
        }
      }
    }
  };
  if (_.isObject(object)) {
    dfs(object);
  }
  return object;
};




// Ariadne implementation.
// Allows adding hooks for lines from stdin and HTTP endpoints.

// Default flag values for the running under a test with no commander involved.
var default_flag_values = {
  host: 'localhost',
  thrift_port: 9090,
  fe_port: 9091,
  server_ready_timeout_ms: 5000,
  server_healthz_period_ms: 5000,
  i64_friendly: true,
};

function Impl(service, config) {
  assert(_.isObject(service));
  assert(_.isObject(service.thrift));
  assert(_.isObject(service.types));
  this.service = service;

  this.config = config;
  this.i64_friendly = config.hasOwnProperty('no_i64') ? false : default_flag_values.i64_friendly;
  this.start_time_ms = Date.now();

  this.tearing_down = false;

  this.stats = {
    stdin_lines: 0,
    http_requests: 0,
    http_requests_by_method: {}
  };
  this.status = 'INITIALIZING';

  this.methods = {};
  this.last_thrift_response_ms = 0;

  this.log = this.config.verbose ? console.log : function() {};
  assert(_.isObject(config));
  this.stdin_handlers = [];
  this.http_handlers = [];
  this.html_beautifiers = {};
  this.buffer = [];
  this.buffer_unsent_length = 0;
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
      impl.buffer_unsent_length = chunk.length - i;
      var e = chunk[i];
      var callback = function(error, data) {
        if (error) throw error;
        impl.last_thrift_response_ms = Date.now();
        e.callback(null, data);
        e = null;
        go(i + 1);
      };
      if (e.argument) {
        impl.thrift_client[e.method].call(impl.thrift_client, e.argument, callback);
      } else {
        impl.thrift_client[e.method].call(impl.thrift_client, callback);
      }
    } else {
      if (impl.buffer.length > 0) {
        chunk = impl.buffer;
        impl.buffer = [];
        go(0);
      } else {
        impl.buffer_unsent_length = 0;
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
          buffered_entries_count: impl.buffer_unsent_length + impl.buffer.length,
        };
      }));
      impl.express.get('/ariadne/impl/', constructObjectServer(function() {
        return {
          ariadne_version: ariadne_version,
          status: impl.status,
          uptime: impl.uptimeStats(),
          stats: impl.stats,
          buffered_entries_count: impl.buffer_unsent_length + impl.buffer.length,
          endpoints: {
            healthz: '/ariadne/impl/healthz',
            thrift_server_healthz: '/ariadne/impl/thrift_server_healthz',
            status: '/ariadne/impl/status',
            uptime: '/ariadne/impl/uptime',
            stats: '/ariadne/impl/stats',
            methods: '/ariadne/impl/methods',
          },
        };
      }));
      assert(!impl.express_server);
      impl.express_server = impl.express.listen(impl.config.fe_port || default_flag_values.fe_port);
      assert(impl.express_server);
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
        impl.child.once('close', function(code) {
          // Prevent 'impl.child' from being garbage collected or killed after it exited.
          impl.terminated_child = impl.child;
          delete impl.child;
          if (code && code !== 0) {
            impl.log('Terminating with code ' + code + ' since the child server has unexpectedly terminated with it.');
            process.exit(code);
          } else {
            if (impl.child_process_close_callback) {
              impl.log('The child process has terminated with code: ' + code);
              var cb = impl.child_process_close_callback;
              delete impl.child_process_close_callback;
              cb();
            } else {
              impl.log('The child process has unexpectedly terminated successfully. Terminating with code -1');
              process.exit(-1);
            }
          }
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
        var server_ready_timeout_ms = impl.config.server_ready_timeout_ms || default_flag_values.server_ready_timeout_ms;
        setTimeout(function() {
          if (!impl.server_started) {
            impl.status = 'SERVER_START_FAILURE';
            impl.log('Did not received "READY" from the server within ' + server_ready_timeout_ms + ' ms.');
            process.exit(1);
          }
        }, server_ready_timeout_ms);
      }
    },

    function stepCreateThriftConnection(error) {
      if (error) throw error;
      var self = this;

      var host = impl.config.host || default_flag_values.host;
      var thrift_port = impl.config.thrift_port || default_flag_values.thrift_port;
      impl.log('Thrift connection to ' + host + ':' + thrift_port);
      impl.thrift_connection = thrift.createConnection(host, thrift_port);

      // Identical to:
      // impl.thrift_connection = thrift.createConnection(host, thrift_port, {
      //   transport: thrift.TBufferedTransport,
      //   protocol: thrift.TBinaryProtocol,
      // });

      impl.thrift_connection.once('error', function(error) {
        console.trace(error);
        console.error('Thrift connection error. Check whether the backend server is running.');
        process.exit(1);
      });

      impl.status = 'CONNECTING_THRIFT';
      impl.log('Waiting for Thrift to connect.');

      impl.thrift_connection.once('close', function() {
        impl.log('Thrift connection terminated.');
        delete impl.thrift_connection;
        if (_.isFunction(impl.thrift_connection_end_callback)) {
          var cb = impl.thrift_connection_end_callback;
          delete impl.thrift_connection_end_callback;
          cb();
        }
      });

      impl.thrift_connection.once('connect', self);
    },

    function stepCreateThriftClient(error) {
      if (error) throw error;
      var self = this;
      impl.status = 'CREATING_THRIFT_CLIENT';
      impl.log('Thrift connected, creating Thrift client.');
      impl.thrift_client = thrift.createClient(impl.service.thrift, impl.thrift_connection);
      self();
    },

    function stepEnsureClientExportsHealthz(error) {
      if (error) throw error;
      var self = this;

      // Special case for healthz() call that takes has no arguments
      // and gets populated before all other methods.
      impl.methods._healthz = function(callback) {
        assert(_.isFunction(callback));
        impl.buffer.push({
          method: 'healthz',
          callback: callback,
        });
        impl.keepFlushingOutgoingBuffer();
      };

      impl.status = 'CHECKING_FIRST_HEALTHZ';
      impl.log('Ensuring the server returns 1 to healthz().');
      impl.methods._healthz(function(error, data) {
        if (error) throw error;
        if (data === 1) {
          impl.log('Confirmed the server returns 1 to healthz().');
          self();
        } else {
          console.log('healthz() did not return 1.');
          process.exit(1);
        }
      });
    },

    function stepStartHealthzMonitoring(error) {
      if (error) throw error;
      var self = this;
      var period_ms = impl.config.server_healthz_period_ms || default_flag_values.server_healthz_period_ms;
      setInterval(function() {
        if (impl.tearing_down) {
          return;
        }
        var idle_time_ms = Date.now() - impl.last_thrift_response_ms;
        if (idle_time_ms > period_ms * 3) {
          impl.log('healthz(): no response.');
          console.error('No healthz() response received, terminating.');
          process.exit(1);
        } else if (idle_time_ms > period_ms) {
          impl.log('healthz(): sending.');
          impl.methods._healthz(function(error, data) {
            if (error) throw error;
            if (data === 1) {
              impl.log('healthz(): confirmed.');
            } else {
              console.log('healthz() did not return 1.');
              process.exit(1);
            }
          });
        }
      }, period_ms);
      self();
    },

    function stepHealthzCheckPassed(error) {
      if (error) throw error;
      var self = this;
      impl.status = 'THRIFT_CLIENT_CREATED';
      impl.log('Thrift client created.');
      self();
    },

    function stepStartReadline(error) {
      if (error) throw error;
      var self = this;
      assert(!impl.stdin_readline_interface);
      assert(!impl.stdin_readline_line_listener);
      impl.stdin_readline_line_listener = function(line) {
        if (!impl.tearing_down) {
          ++impl.stats.stdin_lines;
          for (var i in impl.stdin_handlers) {
            if (impl.stdin_handlers[i](line)) {
              return;
            }
          }
          impl.log('No stdin handler for line: ' + line);
        }
      };
      impl.stdin_readline_interface = require('./singleton_readline_stdin.js');
      // The above line is the replacement for the construct below.
      // readline.setMaxListeners(0) does not do the trick for complex tests involving 10+ restarts.
      // readline.createInterface({
      //   input: process.stdin,
      //   output: false,
      // });
      impl.stdin_readline_interface.on('line', impl.stdin_readline_line_listener);
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
          var input_type = request.query._ || 'Void';
          if (impl.service.types.hasOwnProperty(input_type)) {
            var argument = new impl.service.types[input_type]();
            for (var i in request.query) {
              if (i !== '_') {
                if (impl.i64_friendly && i.substr(0, 4) === 'i64_') {
                  // Essential, otherwise strings, not numbers, get converted into Int64, which is plain wrong.
                  argument[i] = new Int64(Number(request.query[i]));
                } else {
                  argument[i] = request.query[i];
                }
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

      // Expose each Thrift method prefixed by prefix_rpc (=='ariadne_')
      // as an endpoint prefixed by prefix_url (=='/ariadne/').
      _.each(_.functions(impl.thrift_client), function(name) {
        if (name.substr(0, prefix_rpc.length) === prefix_rpc) {
          var method_name = name.substr(prefix_rpc.length);
          var endpoint_name = prefix_url + method_name;
          impl.log('Exporting method "[ariadne_]' + method_name + '" via endpoint "' + endpoint_name + '".');
          // All Thrift calls Ariadne makes are buffered and sequential.
          impl.methods[method_name] = function(argument, callback) {
            assert(argument);
            assert(_.isFunction(callback));
            impl.buffer.push({
              method: name,
              argument: argument,
              callback: impl.i64_friendly ? function(error, data) { callback(error, un_int64_ify(data)); } : callback,
            });
            impl.keepFlushingOutgoingBuffer();
          };
          impl.express.get(endpoint_name, constructThriftEndpointHandler(method_name));
        }
      });

      impl.status = 'READY';
      self();
    },

    function stepRegisterRemainingAriadneImplEndpoints(error) {
      if (error) throw error;
      var self = this;
      impl.express.get('/ariadne/impl/thrift_server_healthz', function(request, response) {
        impl.methods._healthz(function(error, data) {
          if (error) throw error;
          if (data === 1) {
            sendFormattedResponse(response, 'THRIFT_SERVER_OK');
          } else {
            console.log('healthz() did not return 1.');
            process.exit(1);
          }
        });
      });
      impl.express.get('/ariadne/impl/methods', constructObjectServer(function() {
        return {
          methods: _.functions(impl.methods),
          types: _.functions(impl.service.types),
        };
      }));
      self();
    },

    function stepDone(error) {
      if (error) throw error;
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
  if (impl.tearing_down) {
    impl.log('Already in tearDown(), ignored.');
    console.trace('Already in tearDown(), ignored.');
    callback();
  }
  impl.tearing_down = true;
  step(
    function stepRemoveStdinListener(error) {
      if (error) throw error;
      var self = this;
      if (impl.stdin_readline_interface) {
        if (impl.stdin_readline_line_listener) {
          impl.stdin_readline_interface.removeListener('line', impl.stdin_readline_line_listener);
          delete impl.stdin_readline_line_listener;
        }
        delete impl.stdin_readline_interface;
      }
      self();
    },
    function stepCloseExpressServerIfNecessary(error) {
      if (error) throw error;
      var self = this;
      if (impl.express_server) {
        impl.log('Closing express server.');
        impl.express_server.close(function() {
          impl.log('Express server closed.');
          delete impl.express_server;
          self();
        });
      } else {
        impl.log('Express server not running.');
        self();
      }
    },
    function stepEndThriftConnectionIfNecesary(error) {
      if (error) throw error;
      var self = this;
      if (impl.thrift_connection) {
        assert(!impl.thrift_connection_end_callback);
        impl.thrift_connection_end_callback = function() {
          assert(!impl.thrift_connection_end_callback);
          impl.log('Ended Thrift connection.');
          self();
        };
        impl.log('Ending Thrift connection.');
        impl.thrift_connection.end();
      } else {
        impl.log('Thrift connection has already been ended.');
        self();
      }
    },
    function stepTerminateChildProcessIfNecessary(error) {
      if (error) throw error;
      var self = this;
      // Terminate the child process first.
      // It may look counterintuitive, but stepEndThriftConnectionIfNecesary() may not get
      // to the next callback in step(), and cleaning up a potentially spawned server
      // is more important.
      if (impl.orphan) {
        impl.log('Seems like the child has already been teminated.');
        self();
      } else if (impl.child) {
        assert(!impl.orphan);
        // Prevent 'impl.child' from being garbage collected or killed twice.
        impl.orphan = impl.child;
        delete impl.child;
        impl.log('Terminating the child process.');
        assert(!impl.child_process_close_callback);
        impl.child_process_close_callback = function() {
          assert(!impl.child_process_close_callback);
          impl.log('Child process has been terminated.');
          self();
        }
        // TODO(dkorolev): A more graceful version perhaps? Invoke some method first? Or SIGTERM?
        impl.orphan.kill('SIGKILL');
      } else {
        impl.log('The child process has already been terminated.');
        self();
      }
    },
    function stepHandleLastException(error) {
      if (error) throw error;
      this();
    },
    callback);
};

Impl.prototype.int64_ify = int64_ify;
Impl.prototype.un_int64_ify = un_int64_ify;
Impl.prototype.un_int64_ify_buffer = un_int64_ify_buffer;

module.exports = {
  // Registers Ariadne-specific command line flags.
  registerFlags: function(passed_in_commander) {
    var commander = passed_in_commander || require('commander');
    commander.option('-h, --host [host]', 'The host running the Thrift server.', default_flag_values.host);
    commander.option('-p, --thrift_port [port]', 'The port on which Thrift server is running.', default_flag_values.thrift_port);
    commander.option('-w, --fe_port [port]', 'The port on which HTTP server should be spawned.', default_flag_values.fe_port);
    commander.option('-s, --server_command [command]', 'The command to start the Thrift server to work with.');
    commander.option('--server_ready_timeout_ms [ms]', 'Maximum time to wait for "READY" from the server.', default_flag_values.server_ready_timeout_me);
    commander.option('--server_healthz_period_ms [ms]', 'Maximum idle time after which a healthz() is being invoked.', default_flag_values.server_healthz_period_ms);
    commander.option('-e, --connect_to_existing', 'Connect to an existing Thrift service.');
    commander.option('--no_i64', 'Do not convert node Int64-s into Numbers.');
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
  create: function(service, flags) {
    // Required parameters are Thrift interface and types definition. Ref. the test:
    // var server = ariadne.create({
    //   thrift: require('./gen-nodejs/AriadneUnitTest.js'),
    //   types: require('./gen-nodejs/api_types.js')
    // });
    assert(_.isObject(service));
    assert(_.isObject(service.thrift));
    assert(_.isObject(service.types));
    if (flags) {
      return this.createAriadne(service, flags);
    } else {
      var commander = require('commander');
      commander.version(ariadne_version);
      this.registerFlags(commander);
      commander.parse(process.argv);
      return this.createAriadne(service, commander);
    }
  },

  int64_ify: int64_ify,
  un_int64_ify: un_int64_ify,
  un_int64_ify_buffer: un_int64_ify_buffer,

  ariadne_version: ariadne_version,
};
