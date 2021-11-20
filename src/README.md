# Managed Blockchain Document Ledger

## Architecture

![Architecture Diagram](docs/architecture.png?raw=true "Architecture Diagram")


## Prerequisites

All the deployment steps below should be executed in a Cloud9 instance. See
[Getting started with AWS Cloud9](https://aws.amazon.com/cloud9/getting-started/)
for instructions on how to set one up.

Change the following values:

- instance type: m5.large
- us-east-1a

Otherwise the defaults can be left as-is.

Once the instance is created, open the IDE, and enter the following commands
in the terminal.

```bash
nvm install 16
nvm use 16
nvm alias default 16
```

```bash
git clone https://github.com/TrustTheVote-Project/Electorate-Vanadium-Ledger
cd Electorate-Vanadium-Ledger/src
```


## Deployment

### Initial Setup

```bash
scripts/install-prerequisites.sh
scripts/get-cloud9-data.sh
```

### Credentials

```bash
cdk deploy CredentialsStack
```

### Hyperledger Components

```bash
cdk deploy LedgerStack
scripts/get-ledger-data.sh
```

### Interface Components

```bash
scripts/configure-lambdas.sh
```

The following step may take up to forty minutes to complete:
```bash
cdk deploy InterfaceStack
```

### Hyperledger Configuration

```bash
scripts/configure-ledger.sh
scripts/configure-chaincode.sh
```

### Hyperledger Explorer

```bash
cdk deploy ExplorerStack
scripts/setup-hyperledger-explorer.sh
scripts/start-hyperledger-explorer.sh
```

Now click on Preview button in Cloud 9 IDE, and select Preview Running Application,
then pop out into new browser tab with icon in upper-right of preview panel.


## Testing

```bash
tests/write-document.sh path/to/document/file
```

If successful, the above returns a JSON document with a `documentId` unique
to this record (can be used to fetch it using the reader Lambda) and the
`transactionId` that stored the document on the blockchain.


## To-Do

*  Add secrets manager vpc endpoint for lambda's use
*  Add s3 vpc endpoint for lambda's use
*  Restrict security groups on ledger VPC endpoint to needed ports/protocols for Hyperledger TCP 30001 thru 30004 ?
*  Adjust authorizer to distinguish between writer/reader tokens
*  De-duplicate and clean up helper scripts
*  Write cleaner step by step docs
*  try removing ssl no verify from connection.yaml (also try porting to JSON and loading directly)
*  upgrade fabric client and node version (or at least fix npm audit issues) - or replace with fabric-network
*  finish reader lambda
*  update CDK to v2
*  run explorer in its own VPC and on its own EC2 instance (or in Docker/Fargate)
*  combine connection profiles for lambda and hyperledger explorer
*  fixup lambda credentials (move them to creds stack, generate in prep function)
*  eslint everything
*  improve sleep delay in channel config script
*  fix idempotent issues in scripts (cloud9 expansion, admin user enrollment, configtx)
