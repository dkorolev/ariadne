// api_status().
struct Status {
  1: string status = "OK",
  2: list<string> recent
}

// api_add().
struct AddArguments {
  1: i32 left_hand_side,
  2: i32 right_hand_side
}

struct AddResult {
  1: i32 sum
}

// api_post().
struct PostArguments {
  1: string message
}

struct PostResult {
  1: i32 count_so_far
}

// The service itself.
service AriadneUnitTest {
   Status api_status(),
   AddResult api_add(1: AddArguments arguments),
   PostResult api(1: PostArguments arguments)
}
