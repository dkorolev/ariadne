#include "gen-cpp/AriadneUnitTest.h"

#include <chrono>
#include <thread>
#include <sstream>

#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/server/TSimpleServer.h>
#include <thrift/transport/TServerSocket.h>
#include <thrift/transport/TBufferTransports.h>

#include <gflags/gflags.h>

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

  void ariadne_perf_test(std::string& output, const PerfTestArguments& input) {
    std::ostringstream os;
    os << input.before << ' ' << date_now() << ' ' << input.after;
    output = os.str();
  }

  void ariadne_async_test(std::string& output, const AsyncTestArguments& input) {
    std::this_thread::sleep_for(std::chrono::milliseconds(input.delay_ms));
    output = input.value;
  }
};

DEFINE_int32(thrift_port, 9090, "The port to spawn the Thrift server on.");

int main(int argc, char** argv) {
  if (!google::ParseCommandLineFlags(&argc, &argv, true)) {
    return -1;
  }
  boost::shared_ptr<Impl> handler(new Impl());
  boost::shared_ptr<TProcessor> processor(new AriadneUnitTestProcessor(handler));
  boost::shared_ptr<TServerTransport> serverTransport(new TServerSocket(FLAGS_thrift_port));
  boost::shared_ptr<TTransportFactory> transportFactory(new TBufferedTransportFactory());
  boost::shared_ptr<TProtocolFactory> protocolFactory(new TBinaryProtocolFactory());
  std::cout << "READY" << std::endl;
  TSimpleServer(processor, serverTransport, transportFactory, protocolFactory).serve();
}
