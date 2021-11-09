const shim = require('fabric-shim');

const Chaincode = class {
  async Init(stub) {
    console.debug(stub);
    return shim.success();
  }

  async Invoke(stub) {
    const details = stub.getFunctionAndParameters();
    const method = this[details.fcn];
    if (!method) {
      throw new Error(`Chaincode function does not exist: ${details.fcn}`);
    }
    try {
      const response = await method(stub, details.params);
      return shim.success(response);
    } catch (err) {
      return shim.error(err);
    }
  }

  async put(stub, params) {
    const document = JSON.parse(params);
    const key = document.id;
    const buffer = Buffer.from(JSON.stringify(document));
    await stub.putState(key, buffer);
  }

  async get(stub, params) {
    const document = JSON.parse(params);
    const key = document.id;
    return stub.getState(key);
  }
};

shim.start(new Chaincode());
