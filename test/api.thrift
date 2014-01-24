namespace cpp ariadne_unittest  // For a C++ test.

// ariadne_add(). Adds two numbers.
struct AddArguments {
  1: i32 left_hand_side,
  2: i32 right_hand_side,
}

// The service itself.
service AriadneUnitTest {
  i32 ariadne_add(1: AddArguments arguments),
}
