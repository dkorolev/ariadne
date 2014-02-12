// Note: Only one-parameter functions returning value are fully supported. Please see the test.

var commander = require('commander');
commander.option('--thrift_port [port]', 'The port to spawn the test server on.');
commander.parse(process.argv);

var thrift_port = commander.thrift_port || 9090;

var last_alive_time = Date.now();
var watchdog_timeout = 10000;
setInterval(function() {
  if (Date.now() - last_alive_time >  watchdog_timeout) {
    console.log('Terminating via watchdog.');
    process.exit(-1);
  }
}, 100);

require('thrift').createServer(require('./gen-nodejs/AriadneUnitTest.js'), {
  ariadne_add: function(input, output) {
    last_alive_time = Date.now();
    var sum = input.left_hand_side + input.right_hand_side;
    console.log('' + input.left_hand_side + ' + ' + input.right_hand_side + ' = ' + sum);
    output(null, sum);
  },
  ariadne_perf_test: function(input, output) {
    last_alive_time = Date.now();
    output(null, input.before + ' ' + Date.now() + ' ' + input.after);
  },
  ariadne_async_test: function(input, output) {
    last_alive_time = Date.now();
    console.log('' + input.value + ' in ' + input.delay_ms);
    setTimeout(function() {
      output(null, input.value);
    }, input.delay_ms);
  },
  healthz: function(output) {
    last_alive_time = Date.now();
    output(null, 1);
  },
}).listen(thrift_port).on('listening', function() {
  console.log('Thrift: listening on port ' + thrift_port);
  console.log('READY');
});
