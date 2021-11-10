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

    const apiReaderTokenArn = cdk.Fn.importValue('DocumentLedgerApiReaderTokenArn');
    const apiWriterTokenArn = cdk.Fn.importValue('DocumentLedgerApiWriterTokenArn');
    const apiReaderToken = secretsmanager.Secret.fromSecretAttributes(this, 'ApiReaderToken', {secretCompleteArn: apiReaderTokenArn});
    const apiWriterToken = secretsmanager.Secret.fromSecretAttributes(this, 'ApiWriterToken', {secretCompleteArn: apiWriterTokenArn});
    
    const adminPrivateKeyArn = cdk.Fn.importValue('DocumentLedgerAdminPrivateKeyArn');
    const adminSignedCertArn = cdk.Fn.importValue('DocumentLedgerAdminSignedCertArn');
    const adminPrivateKey = secretsmanager.Secret.fromSecretAttributes(this, 'AdminPrivateKey', {secretCompleteArn: adminPrivateKeyArn});
    const adminSignedCert = secretsmanager.Secret.fromSecretAttributes(this, 'AdminSignedCert', {secretCompleteArn: adminSignedCertArn});

    const authorizerFunction = new lambda.Function(this, 'ApiAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.AssetCode.fromAsset(path.join(__dirname, '../lambdas/authorizer')),
      handler: 'index.handler',
      environment: {
        READER_SECRET_ARN: apiReaderTokenArn,
        WRITER_SECRET_ARN: apiWriterTokenArn,
      },
    });

    apiReaderToken.grantRead(authorizerFunction);
    apiWriterToken.grantRead(authorizerFunction);

    const readerFunction = new lambda.Function(this, 'ApiReaderFunction', {
      vpc: ledgerVpc,
      vpcSubnets: {subnets: ledgerVpc.privateSubnets},
      memorySize: 256,
      timeout: cdk.Duration.seconds(10.0),
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/reader')),
      handler: 'index.handler',
      environment: {
        PRIVATE_KEY_ARN: adminPrivateKeyArn,
        SIGNED_CERT_ARN: adminSignedCertArn,
        MEMBER_ID: memberData.Id,
        MEMBER_NAME: memberData.Name,
        ORDERER_ENDPOINT: networkData.FrameworkAttributes.Fabric.OrderingServiceEndpoint,
        CA_ENDPOINT: memberData.FrameworkAttributes.Fabric.CaEndpoint,
        PEER_ENDPOINT: nodeData.FrameworkAttributes.Fabric.PeerEndpoint,
        CHANNEL_NAME: 'documents',
        CHAINCODE_NAME: 'documents',
      },
    });

    const writerFunction = new lambda.Function(this, 'ApiWriterFunction', {
      vpc: ledgerVpc,
      vpcSubnets: {subnets: ledgerVpc.privateSubnets},
      memorySize: 256,
      timeout: cdk.Duration.seconds(10.0),
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/writer')),
      handler: 'index.handler',
      environment: {
        PRIVATE_KEY_ARN: adminPrivateKeyArn,
        SIGNED_CERT_ARN: adminSignedCertArn,
        MEMBER_ID: memberData.Id,
        MEMBER_NAME: memberData.Name,
        ORDERER_ENDPOINT: networkData.FrameworkAttributes.Fabric.OrderingServiceEndpoint,
        CA_ENDPOINT: memberData.FrameworkAttributes.Fabric.CaEndpoint,
        PEER_ENDPOINT: nodeData.FrameworkAttributes.Fabric.PeerEndpoint,
        CHANNEL_NAME: 'documents',
        CHAINCODE_NAME: 'documents',
      },
    });

    adminPrivateKey.grantRead(readerFunction);
    adminPrivateKey.grantRead(writerFunction);
    adminSignedCert.grantRead(readerFunction);
    adminSignedCert.grantRead(writerFunction);

    const ledgerEndpointName = networkData.VpcEndpointServiceName.replace(`com.amazonaws.${region}.`, '')

    const ledgerEndpoint = new ec2.InterfaceVpcEndpoint(this, 'LedgerEndpoint', {
      vpc: ledgerVpc,
      service: new ec2.InterfaceVpcEndpointAwsService(ledgerEndpointName),
      privateDnsEnabled: true,
    });

    ledgerEndpoint.connections.allowFrom(readerFunction, ec2.Port.allTraffic());
    ledgerEndpoint.connections.allowFrom(writerFunction, ec2.Port.allTraffic());

    const defaultVpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {isDefault: true});
    const defaultVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'DefaultVpcEndpoint', {
      vpc: defaultVpc,
      service: new ec2.InterfaceVpcEndpointAwsService(ledgerEndpointName),
      privateDnsEnabled: true,
    });

    const cloud9SecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'Cloud9SecurityGroup', cloud9Data.securityGroupId);
    defaultVpcEndpoint.connections.allowFrom(cloud9SecurityGroup, ec2.Port.allTraffic());

    const authorizer = new apigateway.TokenAuthorizer(this, 'TokenAuthorizer', {handler: authorizerFunction});

    const reader = new apigateway.LambdaIntegration(readerFunction);
    const writer = new apigateway.LambdaIntegration(writerFunction);

    const api = new apigateway.RestApi(this, 'Api');

    const documents = api.root.addResource('documents');
    documents.addMethod('GET', reader, {authorizer});
    documents.addMethod('POST', writer, {authorizer});

    new cdk.CfnOutput(this, 'ApiEndpointUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

  }

}
