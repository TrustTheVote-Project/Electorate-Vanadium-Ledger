#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


echo "Installing Python packages"
pip3 install --upgrade pip awscli boto3

echo "Installing AWS CDK"
npm install -g aws-sdk aws-cdk@1.130.1

echo "Installing Node dependencies"
npm install


# Pull required Docker images
docker pull hyperledger/fabric-ca:1.4.9
docker pull hyperledger/fabric-tools:1.2.0


echo "Bootstrapping CDK"
cdk bootstrap
