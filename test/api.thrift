// For a C++ test.
namespace cpp ariadne_unittest

// api_add(). Adds two numbers.
struct AddArguments {
  1: i32 left_hand_side,
  2: i32 right_hand_side
}

struct AddResult {
  1: i32 sum
}

// api_post(). Posts a message.
struct PostArguments {
  1: string message
}

struct PostResult {
  1: i32 count_so_far
}

// api_status(). Returns "OK" and the last three messages.
struct Status {
  1: string status = "OK",
  2: list<string> recent
}

// The service itself.
service AriadneUnitTest {
  // Adds two numbers.
  AddResult api_add(1: AddArguments arguments),
  // Posts a message.
  PostResult api_post(1: PostArguments arguments)
  // Returns three most recent messages.
  Status api_status(),
  // Stops the server.
  void api_stop()
}
