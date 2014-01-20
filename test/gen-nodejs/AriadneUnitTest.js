//
// Autogenerated by Thrift Compiler (0.9.1)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
var Thrift = require('thrift').Thrift;

var ttypes = require('./api_types');
//HELPER FUNCTIONS AND STRUCTURES

AriadneUnitTest_api_status_args = function(args) {
};
AriadneUnitTest_api_status_args.prototype = {};
AriadneUnitTest_api_status_args.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    input.skip(ftype);
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AriadneUnitTest_api_status_args.prototype.write = function(output) {
  output.writeStructBegin('AriadneUnitTest_api_status_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AriadneUnitTest_api_status_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined) {
      this.success = args.success;
    }
  }
};
AriadneUnitTest_api_status_result.prototype = {};
AriadneUnitTest_api_status_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.Status();
        this.success.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AriadneUnitTest_api_status_result.prototype.write = function(output) {
  output.writeStructBegin('AriadneUnitTest_api_status_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AriadneUnitTest_api_add_args = function(args) {
  this.arguments = null;
  if (args) {
    if (args.arguments !== undefined) {
      this.arguments = args.arguments;
    }
  }
};
AriadneUnitTest_api_add_args.prototype = {};
AriadneUnitTest_api_add_args.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.arguments = new ttypes.AddArguments();
        this.arguments.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AriadneUnitTest_api_add_args.prototype.write = function(output) {
  output.writeStructBegin('AriadneUnitTest_api_add_args');
  if (this.arguments !== null && this.arguments !== undefined) {
    output.writeFieldBegin('arguments', Thrift.Type.STRUCT, 1);
    this.arguments.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AriadneUnitTest_api_add_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined) {
      this.success = args.success;
    }
  }
};
AriadneUnitTest_api_add_result.prototype = {};
AriadneUnitTest_api_add_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.AddResult();
        this.success.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AriadneUnitTest_api_add_result.prototype.write = function(output) {
  output.writeStructBegin('AriadneUnitTest_api_add_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AriadneUnitTest_api_args = function(args) {
  this.arguments = null;
  if (args) {
    if (args.arguments !== undefined) {
      this.arguments = args.arguments;
    }
  }
};
AriadneUnitTest_api_args.prototype = {};
AriadneUnitTest_api_args.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.arguments = new ttypes.PostArguments();
        this.arguments.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AriadneUnitTest_api_args.prototype.write = function(output) {
  output.writeStructBegin('AriadneUnitTest_api_args');
  if (this.arguments !== null && this.arguments !== undefined) {
    output.writeFieldBegin('arguments', Thrift.Type.STRUCT, 1);
    this.arguments.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AriadneUnitTest_api_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined) {
      this.success = args.success;
    }
  }
};
AriadneUnitTest_api_result.prototype = {};
AriadneUnitTest_api_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ttypes.PostResult();
        this.success.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AriadneUnitTest_api_result.prototype.write = function(output) {
  output.writeStructBegin('AriadneUnitTest_api_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AriadneUnitTestClient = exports.Client = function(output, pClass) {
    this.output = output;
    this.pClass = pClass;
    this.seqid = 0;
    this._reqs = {};
};
AriadneUnitTestClient.prototype = {};
AriadneUnitTestClient.prototype.api_status = function(callback) {
  this.seqid += 1;
  this._reqs[this.seqid] = callback;
  this.send_api_status();
};

AriadneUnitTestClient.prototype.send_api_status = function() {
  var output = new this.pClass(this.output);
  output.writeMessageBegin('api_status', Thrift.MessageType.CALL, this.seqid);
  var args = new AriadneUnitTest_api_status_args();
  args.write(output);
  output.writeMessageEnd();
  return this.output.flush();
};

AriadneUnitTestClient.prototype.recv_api_status = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new AriadneUnitTest_api_status_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('api_status failed: unknown result');
};
AriadneUnitTestClient.prototype.api_add = function(arguments, callback) {
  this.seqid += 1;
  this._reqs[this.seqid] = callback;
  this.send_api_add(arguments);
};

AriadneUnitTestClient.prototype.send_api_add = function(arguments) {
  var output = new this.pClass(this.output);
  output.writeMessageBegin('api_add', Thrift.MessageType.CALL, this.seqid);
  var args = new AriadneUnitTest_api_add_args();
  args.arguments = arguments;
  args.write(output);
  output.writeMessageEnd();
  return this.output.flush();
};

AriadneUnitTestClient.prototype.recv_api_add = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new AriadneUnitTest_api_add_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('api_add failed: unknown result');
};
AriadneUnitTestClient.prototype.api = function(arguments, callback) {
  this.seqid += 1;
  this._reqs[this.seqid] = callback;
  this.send_api(arguments);
};

AriadneUnitTestClient.prototype.send_api = function(arguments) {
  var output = new this.pClass(this.output);
  output.writeMessageBegin('api', Thrift.MessageType.CALL, this.seqid);
  var args = new AriadneUnitTest_api_args();
  args.arguments = arguments;
  args.write(output);
  output.writeMessageEnd();
  return this.output.flush();
};

AriadneUnitTestClient.prototype.recv_api = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new AriadneUnitTest_api_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('api failed: unknown result');
};
AriadneUnitTestProcessor = exports.Processor = function(handler) {
  this._handler = handler
}
AriadneUnitTestProcessor.prototype.process = function(input, output) {
  var r = input.readMessageBegin();
  if (this['process_' + r.fname]) {
    return this['process_' + r.fname].call(this, r.rseqid, input, output);
  } else {
    input.skip(Thrift.Type.STRUCT);
    input.readMessageEnd();
    var x = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN_METHOD, 'Unknown function ' + r.fname);
    output.writeMessageBegin(r.fname, Thrift.MessageType.Exception, r.rseqid);
    x.write(output);
    output.writeMessageEnd();
    output.flush();
  }
}

AriadneUnitTestProcessor.prototype.process_api_status = function(seqid, input, output) {
  var args = new AriadneUnitTest_api_status_args();
  args.read(input);
  input.readMessageEnd();
  this._handler.api_status(function (err, result) {
    var result = new AriadneUnitTest_api_status_result((err != null ? err : {success: result}));
    output.writeMessageBegin("api_status", Thrift.MessageType.REPLY, seqid);
    result.write(output);
    output.writeMessageEnd();
    output.flush();
  })
}

AriadneUnitTestProcessor.prototype.process_api_add = function(seqid, input, output) {
  var args = new AriadneUnitTest_api_add_args();
  args.read(input);
  input.readMessageEnd();
  this._handler.api_add(args.arguments, function (err, result) {
    var result = new AriadneUnitTest_api_add_result((err != null ? err : {success: result}));
    output.writeMessageBegin("api_add", Thrift.MessageType.REPLY, seqid);
    result.write(output);
    output.writeMessageEnd();
    output.flush();
  })
}

AriadneUnitTestProcessor.prototype.process_api = function(seqid, input, output) {
  var args = new AriadneUnitTest_api_args();
  args.read(input);
  input.readMessageEnd();
  this._handler.api(args.arguments, function (err, result) {
    var result = new AriadneUnitTest_api_result((err != null ? err : {success: result}));
    output.writeMessageBegin("api", Thrift.MessageType.REPLY, seqid);
    result.write(output);
    output.writeMessageEnd();
    output.flush();
  })
}

