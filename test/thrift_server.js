var thrift = require('thrift');

var AriadneUnitTest = require('./gen-nodejs/AriadneUnitTest.js');
var ttypes = require('./gen-nodejs/api_types');

var users = {};

thrift.createServer(AriadneUnitTest, {
  ariadne_add: function(input, output) {
    var result = new ttypes.AddResult();
    result.sum = input.left_hand_side + input.right_hand_side;
    output(null, result);
  },
  ariadne_post: function(input, output) {
    messages.push(input.message);
    var result = new ttypes.PostResult();
    result.count_so_far = messages.length;
    output(null, result);
  },
  ariadne_status: function(input, output) {
    var result = new ttypes.Status();
    result.recent = messages;
    output(null, result);
  },
  ariadne_stop: function(output) {
    output(null);
  },
}).listen(9090);

console.log('READY');
