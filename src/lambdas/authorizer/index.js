const aws = require('aws-sdk');

const getResponse = (resource) => {
  const document = {
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 'execute-api:Invoke',
          Resource: resource,
        },
      ],
    },
  };
  return document;
};

const readerSecretName = process.env.READER_SECRET_NAME;
const writerSecretName = process.env.WRITER_SECRET_NAME;

const getSecrets = async () => {
  const sm = new aws.SecretsManager();
  const readerSecret = await sm.getSecretValue({ SecretId: readerSecretName }).promise();
  const writerSecret = await sm.getSecretValue({ SecretId: writerSecretName }).promise();
  return [readerSecret.SecretString, writerSecret.SecretString];
};

exports.handler = async (event, context, callback) => {
  const [readerToken, writerToken] = await getSecrets();
  switch (event.authorizationToken) {
    // TODO: limit based on writer/reader secret
    case readerToken:
      callback(null, getResponse(event.methodArn));
      break;
    case writerToken:
      callback(null, getResponse(event.methodArn));
      break;
    default:
      callback('Unauthorized');
      break;
  }
};
