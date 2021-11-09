# Managed Blockchain Document Ledger


## Prerequisites

Create a new Cloud 9 instance
Expand its EBS volume to 100GB

```bash
sudo growpart /dev/nvme0n1 1
sudo xfs_growfs -d /
```

```bash
nvm install 16
nvm use 16
nvm alias default 16
```

```bash
git clone https://github.com/aws-samples/amazon-managed-blockchain-document-ledger
cd amazon-managed-blockchain-document-ledger
```


## Deployment

### Initial steps

```bash
scripts/install-prerequisites.sh
scripts/get-cloud9-data.sh
```

### Credentials

```bash
cdk deploy CredentialsStack
```

### Ledger Stack

```bash
cdk deploy LedgerStack
```

```bash
scripts/configure-ledger.sh
scripts/configure-chaincode.sh
scripts/get-ledger-data.sh
```

### Interface Stack

```bash
scripts/prep-lambda-functions.sh
scripts/create-lambda-credentials.sh
cdk deploy InterfaceStack
```

### Explorer Stack

```bash
scripts/setup-hyperledger-explorer.sh
scripts/start-hyperledger-explorer.sh
```

Now click on Preview button in Cloud 9 IDE, and select Preview Running Application,
then pop out into new browser tab with icon in upper-right of preview panel.


## Testing

```bash
tests/write-document.sh path/to/document/file
```


## To-Do

*  Add secrets manager vpc endpoint for lambda's use
*  Add s3 vpc endpoint for lambda's use
*  Restrict security groups on ledger VPC endpoint to needed ports/protocols for Hyperledger TCP 30001 thru 30004 ?
*  Adjust authorizor to distinguish between writer/reader tokens
*  De-duplicate and clean up helper scripts
*  Write cleaner step by step docs
*  try removing ssl no verify from connection.yaml (also try porting to JSON and loading directly)
*  upgrade fabric client and node version (or at least fix npm audit issues)
*  finish reader lambda
*  update CDK to v2
*  run explorer in its own VPC and on its own EC2 instance (or in Docker/Fargate)
*  combine connection profiles for lambda and hyperledger explorer
*  fixup lambda credentials (move them to creds stack, generate in prep function)
*  eslint everything
