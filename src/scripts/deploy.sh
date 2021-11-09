#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


scripts/install-prerequisites.sh
scripts/get-cloud9-data.sh

cdk deploy CredentialsStack

cdk deploy LedgerStack
scripts/configure-ledger.sh
scripts/configure-chaincode.sh
scripts/get-ledger-data.sh

scripts/prep-lambda-functions.sh
scripts/create-lambda-credentials.sh
cdk deploy InterfaceStack

scripts/setup-hyperledger-explorer.sh
scripts/start-hyperledger-explorer.sh
