#!/bin/bash
#
# Unit test for Ariadne. Tests parsing input from stdin and HTTP.
#
# To run a test against a C++ Thrift backend:
# (cd c++; make)
# ./run_test.sh c++/cpp_thrift_server

RUN_SERVER=${1:-node ariande_server.js}
TEST_PORT=9091
echo -e "Server command: \e[1;34m$RUN_SERVER\e[0m"

TMPDIR=$(mktemp -d)
echo -e "Working directory: \e[1;34m$TMPDIR\e[0m"

DIFF="diff -w"

INPUT=$TMPDIR/pipe
mkfifo $INPUT

OUTPUT=$TMPDIR/output
GOLDEN=$TMPDIR/golden
touch $OUTPUT
touch $GOLDEN

make

#tail -f $INPUT | node ariadne_client.js -w $TEST_PORT --connect_to_existing > $OUTPUT &
tail -f $INPUT | node ariadne_client.js -w $TEST_PORT --server_command="c++/cpp_thrift_server" > $OUTPUT &
CLIENT_PID=$!
echo 'STARTED' >> $GOLDEN
while ! $DIFF $GOLDEN $OUTPUT >/dev/null ; do echo -n . ; sleep 0.2 ; done
echo

echo -n 'Started Ariadne client: '
echo -e "\e[1;32mPID $CLIENT_PID\e[0m"

echo -n 'Testing 1+1 via stdin: .'
echo '1 1' >> $INPUT
echo '2' >> $GOLDEN
while ! $DIFF $GOLDEN $OUTPUT >/dev/null ; do echo -n . ; sleep 0.2 ; done
echo -e ' \e[1;32mOK\e[0m'


echo -n 'Confirming /stats reflect one stdin and one GET request: '
if ! echo '{"stdin_lines":1,"http_requests":1,"http_requests_by_method":{"GET":1}}' | $DIFF - <(curl -s localhost:$TEST_PORT/stats) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Testing UNRECOGNIZED via stdin: .'
echo 'foo' >> $INPUT
echo 'UNRECOGNIZED' >> $GOLDEN
while ! $DIFF $GOLDEN $OUTPUT >/dev/null ; do echo -n . ; sleep 0.2 ; done
echo -e ' \e[1;32mOK\e[0m'


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


echo -n 'Testing /beauty endpoint: '
if ! echo '{"beautifier":"unittest","caption":"Beauty","value":42}' | $DIFF - <(curl -s localhost:$TEST_PORT/beauty) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Testing /beauty endpoint in HTML format: '
cat <<EOF >$GOLDEN
<h1>Beauty</h1>
<p>42</p>
EOF
if ! $DIFF $GOLDEN <(curl -s -H "Accept: text/html" localhost:$TEST_PORT/beauty) ; then
  echo -e '\e[1;31mFAIL\e[0m'
  echo STOP >> $INPUT
  exit 1
fi
echo -e '\e[1;32mOK\e[0m'


echo -n 'Confirming /stats reflect two stdin and six GET requests: '
if ! echo '{"stdin_lines":2,"http_requests":6,"http_requests_by_method":{"GET":6}}' | $DIFF - <(curl -s localhost:$TEST_PORT/stats) ; then
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
