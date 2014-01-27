namespace cpp ariadne_unittest

struct AddArguments {
  1: i32 left_hand_side,
  2: i32 right_hand_side,
}

struct PerfTestArguments {
  1: required string before,
  2: required string after,
}

struct AsyncTestArguments {
  1: required string value = "OK",
  2: i32 delay_ms = 500,
}

service AriadneUnitTest {
  i32 healthz(),
  i32 ariadne_add(1: AddArguments arguments),
  string ariadne_perf_test(1: PerfTestArguments input),
  string ariadne_async_test(1: AsyncTestArguments input),
}
