import * as cdk from '@aws-cdk/core';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

export class CredentialsStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    const passwordRequirements = {
      passwordLength: 32,
      requireEachIncludedType: true,
      excludeCharacters: '\'"/\\@&{}',
    };

    const memberAdminPassword = new secretsmanager.Secret(this, 'LedgerMemberAdminPassword', {
      generateSecretString: passwordRequirements,
    });

    new cdk.CfnOutput(this, 'AdminPasswordName', {
      value: memberAdminPassword.secretName,
      exportName: 'LedgerMemberAdminPasswordSecretName',
      description: 'Secret name for ledger member admin password',
    });

  }

}
