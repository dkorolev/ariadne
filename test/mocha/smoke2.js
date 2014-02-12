// A copy of smoke.js.
// To test that Ariadne server is teared down properly: Releases the ports and allows for the new one to start.

'use strict';

var request = require('supertest');
var fs = require('fs');
var path = require('path');

var ariadne_client = require('../ariadne_client.js');
var flags = {
  server_command: 'node ' + path.resolve(__dirname, '../thrift_server.js'),
  verbose: false,
};

var ariadne;
describe('Smoke test.', function() {
  it('Starts Up', function(done) {
    ariadne_client.run(flags, function(ariadne_instance) {
      ariadne = ariadne_instance;
      done();
    });
  }),
  it('/ariadne/impl/healthz (Adiadne)', function(done) {
    request(ariadne.express)
      .get('/ariadne/impl/healthz')
      .expect(200)
      .end(function(error, result) {
        if (error) throw error;
        result.text.should.equal('OK');
        done();
      });
  });
  it('/ariadne/impl/thrift_server_healthz (Ariadne)', function(done) {
    request(ariadne.express)
      .get('/ariadne/impl/thrift_server_healthz')
      .expect(200)
      .end(function(error, result) {
        if (error) throw error;
        result.text.should.equal('THRIFT_SERVER_OK');
        done();
      });
  });
  it('/demo (Ariadne + user client code, via expresss.js)', function(done) {
    request(ariadne.express)
      .get('/demo')
      .expect(200)
      .end(function(error, result) {
        if (error) throw error;
        result.text.should.equal('{"test":"passed","url":"http://google.com"}');
        done();
      });
  });
  it('/ariadne/add (Ariadne + user server code, via Thrift)', function(done) {
    request(ariadne.express)
      .get('/ariadne/add?_=AddArguments&left_hand_side=1&right_hand_side=2')
      .expect(200)
      .end(function(error, result) {
        if (error) throw error;
        result.text.should.equal('3');
        done();
      });
  });
  it('Tears Down', function(done) {
    ariadne.tearDown(function() {
      done();
    });
  });
});
