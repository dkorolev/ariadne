CC=g++ -std=c++11

all: cpp_thrift_server gen-cpp/OK

cpp_thrift_server: cpp_thrift_server.cc gen-cpp/OK
	${CC} -o $@ $< gen-cpp/*.o -lthrift -lssl -lpthread

gen-cpp/OK: ../api.thrift
	thrift --gen cpp -r $<
	(cd gen-cpp; for i in `ls *.cpp | grep -v skeleton` ; do g++ -c $$i ; done)
	echo OK >$@

clean:
	rm -rf cpp_thrift_server gen-cpp/
