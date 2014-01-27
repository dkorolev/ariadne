#!/bin/bash
./run_test.sh
(cd c++; make) && ./run_test.sh c++/binary
