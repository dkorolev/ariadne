var ariadne = require('../lib/ariadne.js');

process.on('uncaughtException', function(error) {
  console.trace(error);
  process.exit(1);
});

var server = ariadne.create({
  thrift: require('./gen-nodejs/AriadneUnitTest.js'),
  types: require('./gen-nodejs/api_types.js')
});

server.addStdinHandler(
  function(line) {
    var x = line.match(/^\s*(\d+)\s+(\d+)\s*$/);
    if (x) {
      console.log(Number(x[1]) + Number(x[2]));
      return true;
    }
  });

server.addStdinHandler(
  function(line) {
    if (line.trim().toUpperCase() === 'STOP') {
      server.tearDown(function() {
        process.exit(0);
      });
      return true;
    }
  });

server.addStdinHandler(
  function(line) {
    console.log('UNRECOGNIZED');
    return true;
  });

server.run(function() {
  console.log('STARTED');
});
