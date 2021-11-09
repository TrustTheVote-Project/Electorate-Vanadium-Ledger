import * as path from 'path';

import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

import networkData from '../cdk.out/data/network.json';
import memberData from '../cdk.out/data/member.json';
import nodeData from '../cdk.out/data/node.json';
import cloud9Data from '../cdk.out/data/cloud9.json';

export class InterfaceStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    const region = cdk.Stack.of(this).region;

    const ledgerVpc = new ec2.Vpc(this, 'LedgerVpc');

    const ledgerEndpointName = networkData.VpcEndpointServiceName.replace(`com.amazonaws.${region}.`, '')

    const ledgerEndpoint = new ec2.InterfaceVpcEndpoint(this, 'LedgerEndpoint', {
      vpc: ledgerVpc,
      service: new ec2.InterfaceVpcEndpointAwsService(ledgerEndpointName),
      privateDnsEnabled: true,
    });

    const readerToken = new secretsmanager.Secret(this, 'LedgerApiReaderToken');
    const writerToken = new secretsmanager.Secret(this, 'LedgerApiWriterToken');

    const authorizerFunction = new lambda.Function(this, 'LedgerAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.AssetCode.fromAsset(path.join(__dirname, '../lambdas/authorizer')),
      handler: 'index.handler',
      environment: {
        READER_SECRET_NAME: readerToken.secretName,
        WRITER_SECRET_NAME: writerToken.secretName,
      },
    });

    readerToken.grantRead(authorizerFunction);
    writerToken.grantRead(authorizerFunction);
    
    const readerFunction = new lambda.Function(this, 'LedgerReaderFunction', {
      vpc: ledgerVpc,
      vpcSubnets: {subnets: ledgerVpc.privateSubnets},
      memorySize: 256,
      timeout: cdk.Duration.seconds(10.0),
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/reader')),
      handler: 'index.handler',
      environment: {
        MEMBER_ID: memberData.Id,
        MEMBER_NAME: memberData.Name,
        ORDERER_ENDPOINT: networkData.FrameworkAttributes.Fabric.OrderingServiceEndpoint,
        CA_ENDPOINT: memberData.FrameworkAttributes.Fabric.CaEndpoint,
        PEER_ENDPOINT: nodeData.FrameworkAttributes.Fabric.PeerEndpoint,
        CHANNEL_NAME: 'documents',
        CHAINCODE_NAME: 'documents',
      },
    });

    const writerFunction = new lambda.Function(this, 'LedgerWriterFunction', {
      vpc: ledgerVpc,
      vpcSubnets: {subnets: ledgerVpc.privateSubnets},
      memorySize: 256,
      timeout: cdk.Duration.seconds(10.0),
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/writer')),
      handler: 'index.handler',
      environment: {
        MEMBER_ID: memberData.Id,
        MEMBER_NAME: memberData.Name,
        ORDERER_ENDPOINT: networkData.FrameworkAttributes.Fabric.OrderingServiceEndpoint,
        CA_ENDPOINT: memberData.FrameworkAttributes.Fabric.CaEndpoint,
        PEER_ENDPOINT: nodeData.FrameworkAttributes.Fabric.PeerEndpoint,
        CHANNEL_NAME: 'documents',
        CHAINCODE_NAME: 'documents',
      },
    });

    ledgerEndpoint.connections.allowFrom(readerFunction, ec2.Port.allTraffic());
    ledgerEndpoint.connections.allowFrom(writerFunction, ec2.Port.allTraffic());

    const adminPrivateKey = secretsmanager.Secret.fromSecretName(this, 'LedgerAdminPrivateKey', 'admin/pk');
    const adminSignedCert = secretsmanager.Secret.fromSecretName(this, 'LedgerAdminSigningCert', 'admin/signcert');
    adminPrivateKey.grantRead(readerFunction);
    adminPrivateKey.grantRead(writerFunction);
    adminSignedCert.grantRead(readerFunction);
    adminSignedCert.grantRead(writerFunction);

    const authorizer = new apigateway.TokenAuthorizer(this, 'LedgerTokenAuthorizer', {handler: authorizerFunction});

    const reader = new apigateway.LambdaIntegration(readerFunction);
    const writer = new apigateway.LambdaIntegration(writerFunction);

    const api = new apigateway.RestApi(this, 'LedgerApi');

    const documents = api.root.addResource('documents');
    documents.addMethod('GET', reader, {authorizer});
    documents.addMethod('POST', writer, {authorizer});

    const defaultVpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {isDefault: true});
    const defaultVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'DefaultVpcEndpoint', {
      vpc: defaultVpc,
      service: new ec2.InterfaceVpcEndpointAwsService(ledgerEndpointName),
      privateDnsEnabled: true,
    });

    const cloud9SecurityGroup = ec2.SecurityGroup.fromLookup(this, 'Cloud9SecurityGroup', cloud9Data.securityGroupId);
    defaultVpcEndpoint.connections.allowFrom(cloud9SecurityGroup, ec2.Port.allTraffic());
    cloud9SecurityGroup.connections.allowToAnyIpv4(ec2.Port.allTraffic());

    new cdk.CfnOutput(this, 'ApiEndpointUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'ReaderTokenName', {
      value: readerToken.secretName,
      description: 'Secret name for the reader API token',
    });

    new cdk.CfnOutput(this, 'WriterTokenName', {
      value: writerToken.secretName,
      description: 'Secret name for the writer API token',
    });

  }

}
