#include "gen-cpp/AriadneUnitTest.h"

#include <chrono>
#include <sstream>

#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/server/TSimpleServer.h>
#include <thrift/transport/TServerSocket.h>
#include <thrift/transport/TBufferTransports.h>

using namespace ::apache::thrift;
using namespace ::apache::thrift::protocol;
using namespace ::apache::thrift::transport;
using namespace ::apache::thrift::server;

using namespace ::ariadne_unittest;

int64_t date_now() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

struct Impl : virtual public AriadneUnitTestIf {
  int32_t ariadne_add(const AddArguments& arguments) {
    return arguments.left_hand_side + arguments.right_hand_side;
  }

  void ariadne_loadtest(std::string& output, const LoadTestArguments& input) {
    std::ostringstream os;
    os << input.before << ' ' << date_now() << ' ' << input.after;
    output = os.str();
  }
};

int main(int argc, char** argv) {
  const int FLAGS_port = 9090;  // Avoid depending on gflags in this test.
  boost::shared_ptr<Impl> handler(new Impl());
  boost::shared_ptr<TProcessor> processor(new AriadneUnitTestProcessor(handler));
  boost::shared_ptr<TServerTransport> serverTransport(new TServerSocket(FLAGS_port));
  boost::shared_ptr<TTransportFactory> transportFactory(new TBufferedTransportFactory());
  boost::shared_ptr<TProtocolFactory> protocolFactory(new TBinaryProtocolFactory());
  std::cout << "READY" << std::endl;
  TSimpleServer(processor, serverTransport, transportFactory, protocolFactory).serve();
}
