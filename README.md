# ariadne

```npm install ariadne```

## Motivation

A node.js frontend and wrapper for Thrift backends.


## Functionality

* **Provides a clean JSON-based interface to a backend server exposing Thrift.**

  Allows using ```curl``` to interact with a Thrift-based server.


* **Captures console input, allows passing messages from it to the backend.**
  
  Provides a way for ```tail -f $logfile | ...``` to easily reach the the Thrift-based backend.


* **Simple plug-in architecture to inject better visualizers for some endpoints.**
  
  Makes it easy to beautify the outputs of certain Thrift methods when they need a bit more than formatted JSON with clickable links.


**Note:** Only one-parameter Thrift calls are now fully supported. Please refer to the test for more details.

## Usecase

Originally designed to be used with:
* ```npm install overlog``` log storer and fetcher, and
* C++ clients based on https://github.com/dkorolev/marvin.

## Example

The minimalistic version of https://github.com/dkorolev/ariadne/blob/master/test/ariadne_client.js.

Will connect to an running server or spawn a new one (use ```--server_command /path/to/my/binary``` or ```--connect_to_existing```) and have its Thrifted methods prefixed with ```ariadne_*``` exported as HTTP endpoints on ```http://localhost:$PORT/ariadne/*```.

```javascript
require('ariadne').create({
  thrift: require('./gen-nodejs/API.js'),
  types: require('./gen-nodejs/api_types.js')
}.run(function() {
  console.log('Running.');
});

```
