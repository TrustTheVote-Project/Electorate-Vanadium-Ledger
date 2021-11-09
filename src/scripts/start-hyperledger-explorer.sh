#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


. ~/.nvm/nvm.sh
nvm install 12
nvm use 12


cd ../blockchain-explorer
DISCOVERY_AS_LOCALHOST=false ./start.sh
