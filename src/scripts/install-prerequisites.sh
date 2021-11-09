#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


echo "Increasing Cloud9 storage"
export INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
export VOLUME_ID=$(aws ec2 describe-volumes --filters Name=attachment.instance-id,Values=$INSTANCE_ID --query Volumes[*].VolumeId --output text)
aws ec2 modify-volume --volume-id $VOLUME_ID --size 50
sleep 10.0
sudo growpart /dev/nvme0n1 1
sudo xfs_growfs -d /


echo "Installing Python packages"
pip3 install --upgrade pip awscli boto3

echo "Installing AWS CDK"
npm install -g aws-sdk aws-cdk@1.131.0

echo "Installing Node dependencies"
npm install


echo "Pulling Hyperledger tools docker images"
docker pull hyperledger/fabric-ca:1.4.9
docker pull hyperledger/fabric-tools:1.2.0


echo "Creating dummy CDK data files"
mkdir -p cdk.out/data
echo '{"instanceId":"","securityGroupId":""}' > cdk.out/data/cloud9.json
echo '{"FrameworkAttributes":{"Fabric":{"OrderingServiceEndpoint":""}},"VpcEndpointServiceName":""}' > cdk.out/data/network.json
echo '{"Id":"","Name":"","FrameworkAttributes":{"Fabric":{"CaEndpoint":"","PeerEndpoint":""}}}' > cdk.out/data/member.json
echo '{"FrameworkAttributes":{"Fabric":{"PeerEndpoint":"","PeerEventEndpoint":""}}}' > cdk.out/data/node.json

echo "Bootstrapping CDK"
cdk bootstrap
