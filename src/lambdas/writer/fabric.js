const path = require('path');

const aws = require('aws-sdk');
const fabricClient = require('fabric-client');

const config = require('./config');

const getSecret = async (secretId) => {
  const sm = new aws.SecretsManager();
  const secret = await sm.getSecretValue({SecretId: secretId}).promise();
  return secret.SecretString;
};

async function getClient() {
 
	const client = fabricClient.loadFromConfig(path.join(__dirname, './connection.yaml'));

	const crypto_suite = fabricClient.newCryptoSuite();
	const crypto_store = fabricClient.newCryptoKeyStore({path: '/tmp'});
	crypto_suite.setCryptoKeyStore(crypto_store);
	client.setCryptoSuite(crypto_suite);

  const username = 'admin';
  const privateKeyPEM = await getSecret('admin/pk');
  const signedCertPEM = await getSecret('admin/signcert');
  const cryptoContent = {privateKeyPEM, signedCertPEM};
  
  const user = await client.createUser({cryptoContent, username, mspid: config.memberId, skipPersistence: true});
  client.setUserContext(user, true);

  return client;

}

module.exports = {getClient};