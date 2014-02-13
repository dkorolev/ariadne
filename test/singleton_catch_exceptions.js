process.on('uncaughtException', function(error) {
  console.trace(error);
  process.exit(1);
});
