CC=g++ -std=c++11 -O3

all: binary gen-cpp/OK

binary: cpp_thrift_server.cc gen-cpp/OK
	${CC} -o $@ $< gen-cpp/*.o -lthrift -lssl -lpthread

gen-cpp/OK: ../api.thrift
	thrift --gen cpp -r $<
	(cd gen-cpp; for i in `ls *.cpp | grep -v skeleton` ; do g++ -O3 -c $$i ; done)
	echo OK >$@

clean:
	rm -rf binary gen-cpp/
