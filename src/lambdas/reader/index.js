exports.handler = async (event, context) => { // eslint-disable-line no-unused-vars
  const response = { statusCode: 200, body: JSON.stringify(event) };
  return response;
};
