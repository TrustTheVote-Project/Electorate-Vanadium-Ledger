#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export CREDENTIALS_STACK="CredentialsStack"
export LEDGER_STACK="LedgerStack"
export EXPLORER_STACK="ExplorerStack"

export NETWORK_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NetworkId`].OutputValue' --output text)
export MEMBER_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberId`].OutputValue' --output text)
export NODE_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NodeId`].OutputValue' --output text)

export MEMBER_NAME=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberName`].OutputValue' --output text)

export ORDERER_ENDPOINT=$(aws managedblockchain get-network --network-id $NETWORK_ID --query 'Network.FrameworkAttributes.Fabric.OrderingServiceEndpoint' --output text)
export CA_ENDPOINT=$(aws managedblockchain get-member --network-id $NETWORK_ID --member-id $MEMBER_ID --query 'Member.FrameworkAttributes.Fabric.CaEndpoint' --output text)
export PEER_ENDPOINT=$(aws managedblockchain get-node --network-id $NETWORK_ID --member-id $MEMBER_ID --node-id $NODE_ID --query 'Node.FrameworkAttributes.Fabric.PeerEndpoint' --output text)


export ADMIN_PASSWORD_ARN=$(aws cloudformation describe-stacks --stack-name $CREDENTIALS_STACK --query 'Stacks[0].Outputs[?OutputKey==`AdminPasswordArn`].OutputValue' --output text)
export ADMIN_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $ADMIN_PASSWORD_ARN --query 'SecretString' --output text)

export DATABASE_SECRET_ARN=$(aws cloudformation describe-stacks --stack-name $EXPLORER_STACK --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' --output text)
export DATABASE_SECRET=$(aws secretsmanager get-secret-value --secret-id $DATABASE_SECRET_ARN --query 'SecretString' --output text)


echo "Setting up dependencies"
sudo yum install -y jq postgresql
. ~/.nvm/nvm.sh
nvm install 12
nvm use 12


echo "Cloning repository"
export EXPLORER_DIR="$HOME/environment/blockchain-explorer"
rm -rf "$EXPLORER_DIR"
pushd "$HOME/environment"
git clone https://github.com/hyperledger/blockchain-explorer
pushd "$EXPLORER_DIR"
git checkout v1.1.8
popd
popd


echo "Setting up connection to PostgreSQL"
export DB_HOSTNAME=$(echo $DATABASE_SECRET | jq -r .host)
export DB_USERNAME=$(echo $DATABASE_SECRET | jq -r .username)
export DB_PASSWORD=$(echo $DATABASE_SECRET | jq -r .password)
export EXPLORER_CONFIG="$EXPLORER_DIR/app/explorerconfig.json"
cp explorer/explorerconfig.json "$EXPLORER_CONFIG"
sed -i "s|%DB_HOSTNAME%|$DB_HOSTNAME|g" "$EXPLORER_CONFIG"
sed -i "s|%DB_USERNAME%|$DB_USERNAME|g" "$EXPLORER_CONFIG"
sed -i "s|%DB_PASSWORD%|$DB_PASSWORD|g" "$EXPLORER_CONFIG"

echo "Setting up database schema"
export PGPASSWORD="$DB_PASSWORD"
psql -X -h $DB_HOSTNAME --username=$DB_USERNAME -v dbname=fabricexplorer -v user=$DB_USERNAME -v passwd=\'$DB_PASSWORD\' -f "$EXPLORER_DIR/app/persistence/fabric/postgreSQL/db/explorerpg.sql"
psql -X -h $DB_HOSTNAME --username=$DB_USERNAME -v dbname=fabricexplorer -v user=$DB_USERNAME -v passwd=\'$DB_PASSWORD\' -f "$EXPLORER_DIR/app/persistence/fabric/postgreSQL/db/updatepg.sql"


echo "Setting up connection to Hyperledger Fabric"
export CA_FILE="$HOME/managedblockchain-tls-chain.pem"
export FABRIC_CONFIG="$EXPLORER_DIR/app/platform/fabric/document-ledger.json"
cp explorer/*.json "$EXPLORER_DIR/app/platform/fabric/"
files=( $HOME/fabric-admin-certs/keystore/* )
sed -i "s|%PRIVATE_KEY_FILENAME%|${files[0]}|g" $FABRIC_CONFIG
files=( $HOME/fabric-admin-certs/signcerts/* )
sed -i "s|%SIGNED_CERT_FILENAME%|${files[0]}|g" $FABRIC_CONFIG
sed -i "s|%CA_FILE%|$CA_FILE|g" $FABRIC_CONFIG
sed -i "s|%MEMBER_ID%|$MEMBER_ID|g" $FABRIC_CONFIG
sed -i "s|%ORDERER_ENDPOINT%|$ORDERER_ENDPOINT|g" $FABRIC_CONFIG
sed -i "s|%ORDERER_ENDPOINT_NO_PORT%|${ORDERER_ENDPOINT/:*/}|g" $FABRIC_CONFIG
sed -i "s|%CA_ENDPOINT%|$CA_ENDPOINT|g" $FABRIC_CONFIG
sed -i "s|%PEER_ENDPOINT%|$PEER_ENDPOINT|g" $FABRIC_CONFIG
sed -i "s|%PEER_ENDPOINT_NO_PORT%|${PEER_ENDPOINT/:*/}|g" $FABRIC_CONFIG
sed -i "s|%ADMIN_PASSWORD%|$ADMIN_PASSWORD|g" $FABRIC_CONFIG


echo "Building Hyperledger Explorer"
pushd "$EXPLORER_DIR"
npm install
pushd app/test
npm install
popd
pushd client
npm install
npm run build
popd
npm run build

echo "Hyperledger Explorer setup completed successfully"
