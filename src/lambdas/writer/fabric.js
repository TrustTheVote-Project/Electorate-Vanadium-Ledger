const path = require('path');

const aws = require('aws-sdk');
const fabricClient = require('fabric-client');

const config = require('./config');

const getSecret = async (secretArn) => {
  const sm = new aws.SecretsManager();
  const secret = await sm.getSecretValue({ SecretId: secretArn }).promise();
  return secret.SecretString;
};

async function getClient() {
  const client = fabricClient.loadFromConfig(path.join(__dirname, './connection.yaml'));

  const cryptoSuite = fabricClient.newCryptoSuite();
  const cryptoStore = fabricClient.newCryptoKeyStore({ path: '/tmp' });
  cryptoSuite.setCryptoKeyStore(cryptoStore);
  client.setCryptoSuite(cryptoSuite);

  const username = 'admin';
  const privateKeyPEM = await getSecret(config.privateKeyArn);
  const signedCertPEM = await getSecret(config.signedCertArn);
  const cryptoContent = { privateKeyPEM, signedCertPEM };

  const user = await client.createUser({
    cryptoContent, username, mspid: config.memberId, skipPersistence: true,
  });
  client.setUserContext(user, true);

  return client;
}

module.exports = { getClient };
