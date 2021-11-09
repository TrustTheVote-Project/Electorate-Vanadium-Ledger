import * as cdk from '@aws-cdk/core';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

export class CredentialsStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    const tokenRequirements = {
      passwordLength: 32,
      requireEachIncludedType: true,
      excludeCharacters: '\'"/\\@&{}<>*',
    };

    const passwordRequirements = {
      passwordLength: 32,
      requireEachIncludedType: true,
      excludeCharacters: '\'"/\\@&{}<>*',
    };

    const apiReaderToken = new secretsmanager.Secret(this, 'ApiReaderToken', {generateSecretString: tokenRequirements});
    const apiWriterToken = new secretsmanager.Secret(this, 'ApiWriterToken', {generateSecretString: tokenRequirements});

    const adminPasswordSecret = new secretsmanager.Secret(this, 'AdminPassword', {generateSecretString: passwordRequirements});
    
    const adminPrivateKeySecret = new secretsmanager.Secret(this, 'AdminPrivateKey');
    const adminSignedCertSecret = new secretsmanager.Secret(this, 'AdminSignedCert');

    new cdk.CfnOutput(this, 'ApiReaderTokenArn', {
      value: apiReaderToken.secretFullArn ? apiReaderToken.secretFullArn : apiReaderToken.secretArn,
      exportName: 'DocumentLedgerApiReaderTokenArn',
      description: 'Secret ARN for API reader token',
    });

    new cdk.CfnOutput(this, 'ApiWriterTokenArn', {
      value: apiWriterToken.secretFullArn || apiWriterToken.secretArn,
      exportName: 'DocumentLedgerApiWriterTokenArn',
      description: 'Secret ARN for API writer token',
    });
    
    new cdk.CfnOutput(this, 'AdminPasswordArn', {
      value: adminPasswordSecret.secretFullArn || adminPasswordSecret.secretArn,
      exportName: 'DocumentLedgerAdminPasswordArn',
      description: 'Secret ARN for ledger admin password',
    });

    new cdk.CfnOutput(this, 'AdminPrivateKeyArn', {
      value: adminPrivateKeySecret.secretFullArn || adminPrivateKeySecret.secretArn,
      exportName: 'DocumentLedgerAdminPrivateKeyArn',
      description: 'Secret ARN for admin private key',
    });
    
    new cdk.CfnOutput(this, 'AdminSignedCertArn', {
      value: adminSignedCertSecret.secretFullArn || adminSignedCertSecret.secretArn,
      exportName: 'DocumentLedgerAdminSignedCertArn',
      description: 'Secret ARN for admin signed certificate',
    });

  }

}
