 // Note: Only one-parameter functions returning value are fully supported. Please see the test.

var thrift = require('thrift');

var AriadneUnitTest = require('./gen-nodejs/AriadneUnitTest.js');
var ttypes = require('./gen-nodejs/api_types');

thrift.createServer(AriadneUnitTest, {
  ariadne_add: function(input, output) {
    var sum = input.left_hand_side + input.right_hand_side;
    console.log('' + input.left_hand_side + ' + ' + input.right_hand_side + ' = ' + (input.left_hand_side + input.right_hand_side));
    output(null, sum);
  },
  ariadne_stop: function(output) {
    output(null);
  },
}).listen(9090);

console.log('READY');
