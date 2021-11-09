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

const readerSecretArn = process.env.READER_SECRET_ARN;
const writerSecretArn = process.env.WRITER_SECRET_ARN;

const getSecrets = async () => {
  const sm = new aws.SecretsManager();
  const readerSecret = await sm.getSecretValue({ SecretId: readerSecretArn }).promise();
  const writerSecret = await sm.getSecretValue({ SecretId: writerSecretArn }).promise();
  return [readerSecret.SecretString, writerSecret.SecretString];
};

exports.handler = async (event, context, callback) => {
  const [readerToken, writerToken] = await getSecrets();
  switch (event.authorizationToken) {
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
