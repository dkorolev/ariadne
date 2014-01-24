namespace cpp ariadne_unittest

struct AddArguments {
  1: i32 left_hand_side,
  2: i32 right_hand_side,
}

struct LoadTestArguments {
  1: required string before,
  2: required string after,
}

service AriadneUnitTest {
  i32 ariadne_add(1: AddArguments arguments),
  string ariadne_loadtest(1: LoadTestArguments input),
}
