import * as cdk from '@aws-cdk/core';
import * as managedblockchain from '@aws-cdk/aws-managedblockchain';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

export class LedgerStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);
    
    const adminPasswordSecret = secretsmanager.Secret.fromSecretAttributes(this, 'AdminPassword', {
      secretCompleteArn: cdk.Fn.importValue('DocumentLedgerAdminPasswordArn'),
    });
    const adminPassword = adminPasswordSecret.secretValue.toString();

    const networkName = 'LedgerNetwork';
    const memberName = 'LedgerMember';

    const networkConfiguration = {
      name: networkName,
      description: networkName,
      framework: 'HYPERLEDGER_FABRIC',
      frameworkVersion: '1.4',
      networkFrameworkConfiguration: {
        networkFabricConfiguration: {
          edition: 'STARTER',
        },
      },
      votingPolicy: {
        approvalThresholdPolicy: {
          proposalDurationInHours: 24,
          thresholdPercentage: 50,
          thresholdComparator: 'GREATER_THAN',
        },
      },
    };

    const memberConfiguration = {
      name: memberName,
      description: memberName,
      memberFrameworkConfiguration: {
        memberFabricConfiguration: {
          adminUsername: 'admin',
          adminPassword: adminPassword,
        },
      },
    };

    const nodeConfiguration = {
      instanceType: 'bc.t3.small',
      availabilityZone: 'us-east-1a',
    };

    const network = new managedblockchain.CfnMember(this, 'DocumentLedger', {networkConfiguration, memberConfiguration});

    const networkId = network.getAtt('NetworkId').toString();
    const memberId = network.getAtt('MemberId').toString();

    const node = new managedblockchain.CfnNode(this, 'DocumentLedgerNode', {networkId, memberId, nodeConfiguration})

    const nodeId = node.getAtt('NodeId').toString();

    new cdk.CfnOutput(this, 'NetworkName', {
      value: networkName,
      description: 'Managed Blockchain network name',
    });

    new cdk.CfnOutput(this, 'MemberName', {
      value: memberName,
      description: 'Managed Blockchain member name',
    });

    new cdk.CfnOutput(this, 'NetworkId', {
      value: networkId,
      description: 'Managed Blockchain network identifier',
    });

    new cdk.CfnOutput(this, 'MemberId', {
      value: memberId,
      description: 'Managed Blockchain member identifier',
    });

    new cdk.CfnOutput(this, 'NodeId', {
      value: nodeId,
      description: 'Managed Blockchain node identifier',
    });

  }

}
