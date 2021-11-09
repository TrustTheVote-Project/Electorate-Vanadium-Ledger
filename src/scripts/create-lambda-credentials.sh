#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export CREDENTIALS_STACK="CredentialsStack"
export LEDGER_STACK="LedgerStack"

export NETWORK_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NetworkId`].OutputValue' --output text)
export MEMBER_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberId`].OutputValue' --output text)
export NODE_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NodeId`].OutputValue' --output text)

export MEMBER_NAME=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberName`].OutputValue' --output text)


# TODO fix all of the below. for now, we'll upload the admin identity details to use
aws secretsmanager create-secret --name "admin/pk" --secret-string "`cat ~/fabric-admin-msp/keystore/*`"
aws secretsmanager create-secret --name "admin/signcert" --secret-string "`cat ~/fabric-admin-msp/signcerts/*`"
exit
# Set up variables for reader and writer Lambdas
export FABRIC_CA_IMAGE="hyperledger/fabric-ca:1.4.9"
export CA_CERT_FILE="$HOME/managedblockchain-tls-chain.pem"
export CA_ENDPOINT=$(aws managedblockchain get-member --network-id $NETWORK_ID --member-id $MEMBER_ID --query 'Member.FrameworkAttributes.Fabric.CaEndpoint' --output text)
export READER_PASSWORD_SECRET_ID=$(aws cloudformation describe-stacks --stack-name $CREDENTIALS_STACK --query 'Stacks[0].Outputs[?OutputKey==`ReaderPasswordName`].OutputValue' --output text)
export WRITER_PASSWORD_SECRET_ID=$(aws cloudformation describe-stacks --stack-name $CREDENTIALS_STACK --query 'Stacks[0].Outputs[?OutputKey==`WriterPasswordName`].OutputValue' --output text)
export READER_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $READER_PASSWORD_SECRET_ID --query 'SecretString' --output text)
export WRITER_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $WRITER_PASSWORD_SECRET_ID --query 'SecretString' --output text)
export ENCODED_READER_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$READER_PASSWORD'''))")
export ENCODED_WRITER_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$WRITER_PASSWORD'''))")
export CA_READER_FULL_URL="https://reader:$ENCODED_READER_PASSWORD@$CA_ENDPOINT"
export CA_WRITER_FULL_URL="https://writer:$ENCODED_WRITER_PASSWORD@$CA_ENDPOINT"
export READER_CERTS_DIR="$HOME/fabric-reader-certs"
export WRITER_CERTS_DIR="$HOME/fabric-writer-certs"

# Register and enroll reader and writer users
export ADMIN_PASSWORD_SECRET_ID=$(aws cloudformation describe-stacks --stack-name $CREDENTIALS_STACK --query 'Stacks[0].Outputs[?OutputKey==`AdminPasswordName`].OutputValue' --output text)
export ADMIN_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $ADMIN_PASSWORD_SECRET_ID --query 'SecretString' --output text)
export ENCODED_ADMIN_PASSWORD=$(python3 -c "import urllib; print(urllib.parse.quote('''$ADMIN_PASSWORD'''))")
export CA_ADMIN_FULL_URL="https://admin:$ENCODED_ADMIN_PASSWORD@$CA_ENDPOINT"
docker run -v "$HOME:$HOME" "$FABRIC_CA_IMAGE" fabric-ca-client enroll -u "$CA_ADMIN_FULL_URL" --tls.certfiles "$CA_CERT_FILE" -M "$READER_CERTS_DIR"
docker run -v "$HOME:$HOME" "$FABRIC_CA_IMAGE" fabric-ca-client enroll -u "$CA_ADMIN_FULL_URL" --tls.certfiles "$CA_CERT_FILE" -M "$WRITER_CERTS_DIR"
sudo chown -R $USER: $READER_CERTS_DIR
sudo chown -R $USER: $WRITER_CERTS_DIR
docker run -v "$HOME:$HOME" "$FABRIC_CA_IMAGE" fabric-ca-client register --id.name "reader" --id.affiliation "$MEMBER_NAME" --tls.certfiles "$CA_CERT_FILE" --id.type user --id.secret "$READER_PASSWORD"
docker run -v "$HOME:$HOME" "$FABRIC_CA_IMAGE" fabric-ca-client register --id.name "writer" --id.affiliation "$MEMBER_NAME" --tls.certfiles "$CA_CERT_FILE" --id.type user --id.secret "$WRITER_PASSWORD"

# Put the user's certificates into secrets
#aws secretsmanager create-secret --name "dev/fabricOrgs/$MEMBERNAME/$FABRICUSER/pk" --secret-string "`cat $CERTS_FOLDER/$FABRICUSER/keystore/*`"
#aws secretsmanager create-secret --name "dev/fabricOrgs/$MEMBERNAME/$FABRICUSER/signcert" --secret-string "`cat $CERTS_FOLDER/$FABRICUSER/signcerts/*`"