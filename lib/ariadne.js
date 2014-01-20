var _ = require('underscore');
var assert = require('assert');
var readline = require('readline');

// Ariadne implementation.
// Allows adding hooks for lines from stdin and HTTP endpoints.
function Impl(config) {
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
Impl.prototype.run = function() {
  var self = this;

  var rl = readline.createInterface({
    input: process.stdin,
    output: false
  });

  rl.on('line', function (line) {
    for (var i in self.stdin_handlers) {
      if (self.stdin_handlers[i](line)) {
        return;
      }
    }
    self.log('No stdin handler for line: ' + line);
  });
};

module.exports = {
  // Registers Ariadne-specific command line flags.
  registerFlags: function(passed_in_commander) {
    var commander = passed_in_commander || require('commander');
    commander.option('-h, --host [host]', 'The host running the Thrift server.', 'localhost');
    commander.option('-p, --port [port]', 'The port on which the Thrift server is running.', 9090);
    commander.option('-v, --verbose', 'Dump debugging information.');
  },

  // Starts Ariadne assuming the flags have been registered before and the command line has been parsed.
  createAriadne: function(passed_in_commander) {
    var commander = passed_in_commander || require('commander');
    return new Impl(commander);
  },

  // Starts Ariadne with no strings attached.
  create: function() {
    var commander = require('commander');
    commander.version(require('../package.json').version);
    this.registerFlags(commander);
    commander.parse(process.argv);
    return this.createAriadne(commander);
  }
};
