#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


scripts/install-prerequisites.sh
scripts/get-cloud9-data.sh

cdk deploy --require-approval never CredentialsStack

cdk deploy --require-approval never LedgerStack
scripts/get-ledger-data.sh

scripts/configure-lambdas.sh
cdk deploy --require-approval never InterfaceStack

scripts/configure-ledger.sh
scripts/configure-chaincode.sh

cdk deploy --require-approval never ExplorerStack
scripts/setup-hyperledger-explorer.sh
scripts/start-hyperledger-explorer.sh
