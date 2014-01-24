#include "gen-cpp/AriadneUnitTest.h"

#include <chrono>
#include <mutex>
#include <thread>

#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/server/TSimpleServer.h>
#include <thrift/transport/TServerSocket.h>
#include <thrift/transport/TBufferTransports.h>

using namespace ::apache::thrift;
using namespace ::apache::thrift::protocol;
using namespace ::apache::thrift::transport;
using namespace ::apache::thrift::server;

using namespace ::ariadne_unittest;

const int FLAGS_port = 9090;  // Avoid depending on gflags in this test.

class Impl : virtual public AriadneUnitTestIf {
 public:
  void ariadne_add(AddResult& result, const AddArguments& arguments) {
    result.sum = arguments.left_hand_side + arguments.right_hand_side;
  }
  void ariadne_stop() {
    exit(0);
  }

 private:
  std::mutex mutex_;
  std::vector<std::string> messages_;
};

int main(int argc, char** argv) {
  boost::shared_ptr<Impl> handler(new Impl());
  boost::shared_ptr<TProcessor> processor(new AriadneUnitTestProcessor(handler));
  boost::shared_ptr<TServerTransport> serverTransport(new TServerSocket(FLAGS_port));
  boost::shared_ptr<TTransportFactory> transportFactory(new TBufferedTransportFactory());
  boost::shared_ptr<TProtocolFactory> protocolFactory(new TBinaryProtocolFactory());
  std::cout << "READY" << std::endl;
  TSimpleServer(processor, serverTransport, transportFactory, protocolFactory).serve();
}
