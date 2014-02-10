all: node_modules/OK

node_modules/OK: package.json
	npm install
	npm update
	echo OK >$@

mocha_tests:
	node_modules/mocha/bin/mocha test/mocha/

clean:
	rm -rf node_modules/
