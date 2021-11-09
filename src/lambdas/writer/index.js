const uuid = require('uuid');

const invoke = require('./invoke');

exports.handler = async (event, context, callback) => { // eslint-disable-line no-unused-vars
  try {
    const args = [JSON.stringify({ id: uuid.v4(), document: event.body })];
    const result = await invoke('put', args);
    const response = { statusCode: 200, body: JSON.stringify(result) };
    callback(null, response);
  } catch (error) {
    console.error(error);
    callback(error.message || error);
  }
};
