all: gen-nodejs/OK

gen-nodejs/OK: api.thrift
	thrift --gen js:node $<
	echo OK >$@

clean:
	rm -rf gen-nodejs
