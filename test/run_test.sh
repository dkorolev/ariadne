#!/bin/bash
#
# Unit test for Ariadne. Tests parsing input from stdin and HTTP.
#
# To run a test against a C++ Thrift backend, either run:
# (cd c++; make) && ./run_test.sh c++/binary
# or:
# ./run_node_and_native_tests.sh

RUN_SERVER=${1:-node thrift_server.js}
THRIFT_PORT=9190
TEST_PORT=9191

RUN_SERVER+=" --thrift_port=$THRIFT_PORT"

echo -e "Server command: \e[1;34m$RUN_SERVER\e[0m"

TMPDIR=$(mktemp -d)
echo -e "Working directory: \e[1;34m$TMPDIR\e[0m"

DIFF="diff -w"

INPUT=$TMPDIR/pipe
mkfifo $INPUT

STDOUT=$TMPDIR/stdout
STDERR=$TMPDIR/stderr
GOLDEN=$TMPDIR/golden
touch $STDOUT
touch $STDERR
touch $GOLDEN

(cd .. ; make) || exit 1  # npm install/update if necessary.
make || exit 1  # autogenerate Thrift code if necessary.

tail -f $INPUT | node ariadne_client.js -w $TEST_PORT -p $THRIFT_PORT --server_command="$RUN_SERVER" >$STDOUT 2>$STDERR &
CLIENT_PID=$!

echo 'STARTED' >> $GOLDEN
while ! $DIFF $GOLDEN $STDOUT >/dev/null ; do echo -n . ; sleep 0.2 ; done
echo

echo -n 'Started Ariadne client: '
echo -e "\e[1;32mPID $CLIENT_PID\e[0m"


echo -n 'Testing 1+1 via stdin: .'
echo '1 1' >> $INPUT
echo '2' >> $GOLDEN
while ! $DIFF $GOLDEN $STDOUT >/dev/null ; do echo -n . ; sleep 0.2 ; done
echo -e ' \e[1;32mOK\e[0m'


echo -n 'Confirming /ariadne/impl/healthz returns OK: '
if ! echo 'OK' | $DIFF - <(curl -s localhost:$TEST_PORT/ariadne/impl/healthz) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Confirming /ariadne/impl/thrift_server_healthz returns THRIFT_SERVER_OK: '
if ! echo 'THRIFT_SERVER_OK' | $DIFF - <(curl -s localhost:$TEST_PORT/ariadne/impl/thrift_server_healthz) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Confirming /ariadne/impl/stats reflect one stdin and three GET requests: '
if ! echo '{"ariadne_version":"0.1.0","stats":{"stdin_lines":1,"http_requests":3,"http_requests_by_method":{"GET":3}},"buffered_entries_count":0}' | $DIFF - <(curl -s localhost:$TEST_PORT/ariadne/impl/stats) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Testing /demo endpoint: '
if ! echo '{"test":"passed","url":"http://google.com"}' | $DIFF - <(curl -s localhost:$TEST_PORT/demo) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Testing /demo endpoint in HTML format: '
cat <<EOF >$GOLDEN
<pre>{
    "test": "passed",
    "url": "<a href='http://google.com'>http://google.com</a>"
}</pre>
EOF
if ! $DIFF $GOLDEN <(curl -s -H "Accept: text/html" localhost:$TEST_PORT/demo) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Testing / endpoint: '
if ! echo '{"beautifier":"unittest","caption":"Beauty","value":42}' | $DIFF - <(curl -s localhost:$TEST_PORT/) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Testing / endpoint in HTML format: '
cat <<EOF >$GOLDEN
<h1>Beauty</h1>
<p>42</p>
EOF
if ! $DIFF $GOLDEN <(curl -s -H "Accept: text/html" localhost:$TEST_PORT/) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Confirming /ariadne/impl/stats reflect one stdin and eight GET requests: '
if ! echo '{"ariadne_version":"0.1.0","stats":{"stdin_lines":1,"http_requests":8,"http_requests_by_method":{"GET":8}},"buffered_entries_count":0}' | $DIFF - <(curl -s localhost:$TEST_PORT/ariadne/impl/stats) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Confirming /ariadne/impl/methods returns the list of Thrift methods exported: '
if ! echo '{"methods":["_healthz","add","add_int64","async_test","perf_test"],"types":["AddArguments","AddInt64Arguments","AddInt64Result","AsyncTestArguments","PerfTestArguments"]}' | $DIFF - <(curl -s localhost:$TEST_PORT/ariadne/impl/methods) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Testing add() via /ariadne/add/ HTTP call proxied to the Thrift server: .'
if ! echo '3' | $DIFF - <(curl -s "localhost:$TEST_PORT/ariadne/add?_=AddArguments&left_hand_side=1&right_hand_side=2") ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e ' \e[1;32mOK\e[0m'


echo -n 'Testing add_int64() via /ariadne/add_int64/ HTTP call proxied to the Thrift server: .'
if ! echo '{"i64_result":2000000000003}' | $DIFF - <(curl -s "localhost:$TEST_PORT/ariadne/add_int64?_=AddInt64Arguments&i64_left_hand_side=1000000000001&i64_right_hand_side=1000000000002") ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e ' \e[1;32mOK\e[0m'


echo -n 'Testing perf_test() via /ariadne/perf_test/ HTTP call proxied to the Thrift server: .'
if ! echo 'foo bar' | $DIFF - <(curl -s "localhost:$TEST_PORT/ariadne/perf_test?_=PerfTestArguments&before=foo&after=bar" | cut -f1,3 -d" ") ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e ' \e[1;32mOK\e[0m'


echo -n 'Measuring performance: .'
echo 'PERF_TEST' >> $INPUT
while ! tail -n 1 $STDOUT | grep qps >/dev/null ; do echo -n . ; sleep 0.2 ; done
echo -e ' \e[1;35m'$(tail -n 1 $STDOUT)'\e[0m'


echo -n 'Testing asynchronous calls: .'
echo 'ASYNC_TEST' >> $INPUT
cat <<EOF >$GOLDEN
EXPECTED: one-two-three-four-five-six-seven-eight-nine-ten-eleven-twelve-thirteen-fourteen-fifteen
RECEIVED: one-two-three-four-five-six-seven-eight-nine-ten-eleven-twelve-thirteen-fourteen-fifteen
EOF
while ! $DIFF $GOLDEN <(tail -n 2 $STDOUT) >/dev/null ; do echo -n . ; sleep 0.2 ; done
echo -e '\e[1;32mOK\e[0m'


echo -n 'Confirming /ariadne/impl/stats now reflect three stdin and thirteen GET requests: '
if ! echo '{"ariadne_version":"0.1.0","stats":{"stdin_lines":3,"http_requests":13,"http_requests_by_method":{"GET":13}},"buffered_entries_count":0}' | $DIFF - <(curl -s localhost:$TEST_PORT/ariadne/impl/stats) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Stopping Ariadne client: '
echo STOP >> $INPUT
while ps -p $CLIENT_PID >/dev/null ; do sleep 0.2 ; done
echo -e '\e[1;32mOK\e[0m'


echo -e '\e[1;32mPASS\e[0m'
rm -rf $TMPDIR

exit 0
