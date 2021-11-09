import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';

import cloud9Data from '../cdk.out/data/cloud9.json';

export class ExplorerStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);
    
    const availabilityZones =  cdk.Stack.of(this).availabilityZones;
    
    const defaultVpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {isDefault: true});
    
    const databaseSubnets = [
      new ec2.Subnet(this, 'DatabaseSubnet0', {
        vpcId: defaultVpc.vpcId,
        cidrBlock: '172.31.160.0/20',
        availabilityZone: availabilityZones[0],
      }),
      new ec2.Subnet(this, 'DatabaseSubnet1', {
        vpcId: defaultVpc.vpcId,
        cidrBlock: '172.31.176.0/20',
        availabilityZone: availabilityZones[1],
      }),
      new ec2.Subnet(this, 'DatabaseSubnet2', {
        vpcId: defaultVpc.vpcId,
        cidrBlock: '172.31.192.0/20',
        availabilityZone: availabilityZones[3],
      }),
    ];

    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({version: rds.PostgresEngineVersion.VER_12}),
      vpc: defaultVpc,
      vpcSubnets: {subnets: databaseSubnets},
      publiclyAccessible: false,
    });
    
    const cloud9SecurityGroup = ec2.SecurityGroup.fromLookup(this, 'Cloud9SecurityGroup', cloud9Data.securityGroupId);
    database.connections.allowDefaultPortFrom(cloud9SecurityGroup);
    cloud9SecurityGroup.connections.allowToAnyIpv4(ec2.Port.allTraffic());

    const databaseSecretName = database.secret ? database.secret.secretName : 'undefined';
    
    new cdk.CfnOutput(this, 'DatabaseSecretName', {
      value: databaseSecretName,
      description: 'Secret name for the database',
    });

  }

}
