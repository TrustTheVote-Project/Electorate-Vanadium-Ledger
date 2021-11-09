#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export CREDENTIALS_STACK="CredentialsStack"
export LEDGER_STACK="LedgerStack"

export NETWORK_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NetworkId`].OutputValue' --output text)
export MEMBER_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberId`].OutputValue' --output text)
export NODE_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NodeId`].OutputValue' --output text)


# Turn on all logging (CA, peers, and chaincode)
aws managedblockchain update-member --network-id $NETWORK_ID --member-id $MEMBER_ID --log-publishing-configuration '{"Fabric":{"CaLogs":{"Cloudwatch":{"Enabled":true}}}}'
aws managedblockchain update-node --network-id $NETWORK_ID --member-id $MEMBER_ID --node-id $NODE_ID --log-publishing-configuration '{"Fabric":{"ChaincodeLogs":{"Cloudwatch":{"Enabled":true}},"PeerLogs":{"Cloudwatch":{"Enabled":true}}}}'


# Download latest Managed Blockchain Certificate
export CA_CERT_FILE="$HOME/managedblockchain-tls-chain.pem"
aws s3 cp "s3://us-east-1.managedblockchain/etc/managedblockchain-tls-chain.pem" "$CA_CERT_FILE"


# Set up an administrative identity with the Fabric CA for initialization use
export CA_ENDPOINT=$(aws managedblockchain get-member --network-id $NETWORK_ID --member-id $MEMBER_ID --query 'Member.FrameworkAttributes.Fabric.CaEndpoint' --output text)
export ADMIN_PASSWORD_SECRET_ID=$(aws cloudformation describe-stacks --stack-name $CREDENTIALS_STACK --query 'Stacks[0].Outputs[?OutputKey==`AdminPasswordName`].OutputValue' --output text)
export ADMIN_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $ADMIN_PASSWORD_SECRET_ID --query 'SecretString' --output text)
export ENCODED_ADMIN_PASSWORD=$(python3 -c "import urllib; print(urllib.parse.quote('''$ADMIN_PASSWORD'''))")
export CA_ADMIN_FULL_URL="https://admin:$ENCODED_ADMIN_PASSWORD@$CA_ENDPOINT"
export FABRIC_CA_IMAGE="hyperledger/fabric-ca:1.4.9"
export ADMIN_MSP_DIR="$HOME/fabric-admin-msp"

docker run -v "$HOME:$HOME" "$FABRIC_CA_IMAGE" fabric-ca-client enroll -u "$CA_ADMIN_FULL_URL" --tls.certfiles "$CA_CERT_FILE" -M "$ADMIN_MSP_DIR"
sudo chown -R $USER: $ADMIN_MSP_DIR
mkdir -p $ADMIN_MSP_DIR/admincerts
cp $ADMIN_MSP_DIR/signcerts/* $ADMIN_MSP_DIR/admincerts/


# Generate configtx channel configuration
export CHANNEL_NAME="documents"
cp "fabric/configtx.yaml" "$HOME/"
sed -i "s|__MEMBERID__|$MEMBER_ID|g" "$HOME/configtx.yaml"
export FABRIC_TOOLS_IMAGE="hyperledger/fabric-tools:1.2.0"
docker run -v "$HOME:/opt/home" $FABRIC_TOOLS_IMAGE configtxgen -outputCreateChannelTx /opt/home/$CHANNEL_NAME.pb -profile OneOrgChannel -channelID $CHANNEL_NAME --configPath /opt/home/

# Create the channel
export ORDERER_ENDPOINT=$(aws managedblockchain get-network --network-id $NETWORK_ID --query 'Network.FrameworkAttributes.Fabric.OrderingServiceEndpoint' --output text)
export PEER_ENDPOINT=$(aws managedblockchain get-node --network-id $NETWORK_ID --member-id $MEMBER_ID --node-id $NODE_ID --query 'Node.FrameworkAttributes.Fabric.PeerEndpoint' --output text)
docker run -v "$HOME:/opt/home" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/home/managedblockchain-tls-chain.pem" \
    -e "CORE_PEER_MSPCONFIGPATH=/opt/home/fabric-admin-msp" \
    -e "CORE_PEER_ADDRESS=$PEER_ENDPOINT" \
    -e "CORE_PEER_LOCALMSPID=$MEMBER_ID" \
    $FABRIC_TOOLS_IMAGE peer channel create -c $CHANNEL_NAME -f /opt/home/$CHANNEL_NAME.pb -o $ORDERER_ENDPOINT --cafile /opt/home/managedblockchain-tls-chain.pem --tls --timeout 900s

# Extract the channel block
docker run -v "$HOME:/opt/home" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/home/managedblockchain-tls-chain.pem" \
    -e "CORE_PEER_MSPCONFIGPATH=/opt/home/fabric-admin-msp" \
    -e "CORE_PEER_ADDRESS=$PEER_ENDPOINT" \
    -e "CORE_PEER_LOCALMSPID=$MEMBER_ID" \
    $FABRIC_TOOLS_IMAGE peer channel fetch oldest /opt/home/$CHANNEL_NAME.block -c $CHANNEL_NAME -o $ORDERER_ENDPOINT --cafile /opt/home/managedblockchain-tls-chain.pem --tls

# Join the peer to the channel
docker run -v "$HOME:/opt/home" \
    -e "CORE_PEER_TLS_ENABLED=true" \
    -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/home/managedblockchain-tls-chain.pem" \
    -e "CORE_PEER_MSPCONFIGPATH=/opt/home/fabric-admin-msp" \
    -e "CORE_PEER_ADDRESS=$PEER_ENDPOINT" \
    -e "CORE_PEER_LOCALMSPID=$MEMBER_ID" \
    $FABRIC_TOOLS_IMAGE peer channel join -b /opt/home/$CHANNEL_NAME.block -o $ORDERER_ENDPOINT --cafile /opt/home/managedblockchain-tls-chain.pem --tls
