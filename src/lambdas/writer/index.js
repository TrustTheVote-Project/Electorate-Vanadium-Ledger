const uuid = require('uuid');

const invoke = require('./invoke');

exports.handler = async (event, context, callback) => {
  try {
    const id = uuid.v4();
    const document = event.body;
    const args = [JSON.stringify({ id, document })];
    const result = await invoke('put', args);
    result.documentId = id;
    const response = { statusCode: 200, body: JSON.stringify(result) };
    callback(null, response);
  } catch (error) {
    console.error(error);
    callback(error.message || error);
  }
};
