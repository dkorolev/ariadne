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


## Usecase

Originally designed to be used with:
* ```npm install overlog``` log storer and fetcher, and
* C++ clients based on https://github.com/dkorolev/marvin.
