all: node_modules/OK

node_modules/OK: package.json
	npm install
	npm update
	echo OK >$@

clean:
	rm -rf node_modules/
