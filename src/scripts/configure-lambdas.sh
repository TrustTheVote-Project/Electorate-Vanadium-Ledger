#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export LEDGER_STACK="LedgerStack"

export NETWORK_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NetworkId`].OutputValue' --output text)
export MEMBER_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberId`].OutputValue' --output text)
export NODE_ID=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`NodeId`].OutputValue' --output text)

export MEMBER_NAME=$(aws cloudformation describe-stacks --stack-name $LEDGER_STACK --query 'Stacks[0].Outputs[?OutputKey==`MemberName`].OutputValue' --output text)

export ORDERER_ENDPOINT=$(aws managedblockchain get-network --network-id $NETWORK_ID --query 'Network.FrameworkAttributes.Fabric.OrderingServiceEndpoint' --output text)
export CA_ENDPOINT=$(aws managedblockchain get-member --network-id $NETWORK_ID --member-id $MEMBER_ID --query 'Member.FrameworkAttributes.Fabric.CaEndpoint' --output text)
export PEER_ENDPOINT=$(aws managedblockchain get-node --network-id $NETWORK_ID --member-id $MEMBER_ID --node-id $NODE_ID --query 'Node.FrameworkAttributes.Fabric.PeerEndpoint' --output text)


function prep_lambda() {
    echo "Prepping $1 lambda"
    LAMBDA_PATH="lambdas/$1"
    cp $HOME/managedblockchain-tls-chain.pem "$LAMBDA_PATH/"
    cp lambdas/connection.yaml "$LAMBDA_PATH/"
    sed -i "s|%NODE_ID%|$NODE_ID|g" $LAMBDA_PATH/connection.yaml
    sed -i "s|%MEMBER_ID%|$MEMBER_ID|g" $LAMBDA_PATH/connection.yaml
    sed -i "s|%ORDERER_ENDPOINT%|$ORDERER_ENDPOINT|g" $LAMBDA_PATH/connection.yaml
    sed -i "s|%ORDERER_ENDPOINT_NO_PORT%|${ORDERER_ENDPOINT/:*/}|g" $LAMBDA_PATH/connection.yaml
    sed -i "s|%CA_ENDPOINT%|$CA_ENDPOINT|g" $LAMBDA_PATH/connection.yaml
    sed -i "s|%PEER_ENDPOINT%|$PEER_ENDPOINT|g" $LAMBDA_PATH/connection.yaml
    sed -i "s|%PEER_ENDPOINT_NO_PORT%|${PEER_ENDPOINT/:*/}|g" $LAMBDA_PATH/connection.yaml
    pushd $LAMBDA_PATH
    npm install
    popd
}


. ~/.nvm/nvm.sh
nvm install 12
nvm use 12


prep_lambda "reader"
prep_lambda "writer"


echo "Lambda configuration completed successfully"
