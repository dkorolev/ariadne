#!/bin/bash
#
# Unit test for Ariadne. Tests parsing input from stdin and HTTP.
#
# To run a test against a C++ Thrift backend:
# (cd c++; make)
# ./run_test.sh c++/cpp_thrift_server

RUN_SERVER=${1:-node ariande_server.js}
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

echo -n 'Starting Ariadne client: '
tail -f $INPUT | node ariadne_client.js > $OUTPUT &
CLIENT_PID=$!
echo -e "\e[1;32mPID $CLIENT_PID\e[0m"


echo -n 'Testing 1+1 via stdin: .'
echo '1 1' >> $INPUT
echo '2' >> $GOLDEN
while ! $DIFF $GOLDEN $OUTPUT >/dev/null ; do echo -n . ; sleep 0.2 ; done
echo -e ' \e[1;32mOK\e[0m'


echo -n 'Testing UNRECOGNIZED via stdin: .'
echo 'foo' >> $INPUT
echo 'UNRECOGNIZED' >> $GOLDEN
while ! $DIFF $GOLDEN $OUTPUT >/dev/null ; do echo -n . ; sleep 0.2 ; done
echo -e ' \e[1;32mOK\e[0m'


echo -n 'Stopping Ariadne client: '
echo STOP >> $INPUT
while ps -p $CLIENT_PID >/dev/null ; do sleep 0.2 ; done
echo -e '\e[1;32mOK\e[0m'


echo -e '\e[1;32mPASS\e[0m'
rm -rf $TMPDIR

exit 0
