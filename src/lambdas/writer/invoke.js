const util = require('util');

const fabric = require('./fabric');
const config = require('./config');

async function invoke(func, args) {
  console.info('=== Invoke Function Start ===');

  const request = {
    chaincodeId: config.chaincodeName, fcn: func, args, chainId: config.channelName,
  };

  let errorMessageDisplayable = null;
  let errorMessage = null;
  let transactionId = null;
  let retriable = false;

  try {
    const client = await fabric.getClient();
    const channel = client.getChannel(config.channelName);

    transactionId = client.newTransactionID();
    console.info(`=== Created transactionId ===${transactionId.getTransactionID()}`);
    request.txId = transactionId;
    request.targets = channel.getPeers();

    // send proposal to endorsing peers
    console.info('##### invokeChaincode - Invoke transaction request to Fabric');
    const proposalResults = await channel.sendTransactionProposal(request).catch((err) => {
      throw err;
    });

    // the returned object has both the endorsement results
    // and the actual proposal, the proposal will be needed
    // later when we send a transaction to the ordering service
    const proposalResponses = proposalResults[0];
    const proposal = proposalResults[1];

    // let's have a look at the responses to see if they are
    // all good, if good they will also include signatures
    // required to be committed
    let successfulResponses = true;
    for (const i in proposalResponses) {
      let oneSuccessfulResponse = false;
      if (proposalResponses && proposalResponses[i].response
                && proposalResponses[i].response.status === 200) {
        oneSuccessfulResponse = true;
        console.info('##### invokeChaincode - received successful proposal response');
      } else {
        console.error('##### invokeChaincode - received unsuccessful proposal response');
      }
      successfulResponses &= oneSuccessfulResponse;
    }

    if (successfulResponses) {
      console.info(util.format(
        '##### invokeChaincode - Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
        proposalResponses[0].response.status, proposalResponses[0].response.message,
      ));

      // wait for the channel-based event hub to tell us
      // that the commit was good or bad on each peer in our organization
      const promises = [];
      const eventHubs = channel.getChannelEventHubsForOrg();
      eventHubs.forEach((eh) => {
        console.info('##### invokeChaincode - invokeEventPromise - setting up event handler');
        const invokeEventPromise = new Promise((resolve, reject) => {
          const eventTimeout = setTimeout(() => {
            const message = `REQUEST_TIMEOUT:${eh.getPeerAddr()}`;
            console.error(message);
            eh.disconnect();
          }, 10000);
          eh.registerTxEvent(transactionId.getTransactionID(), (tx, code, blockNum) => {
            console.info('##### invokeChaincode - The invoke chaincode transaction has been committed on peer %s', eh.getPeerAddr());
            console.info('##### invokeChaincode - Transaction %s has status of %s in block %s', tx, code, blockNum);
            clearTimeout(eventTimeout);

            if (code !== 'VALID') {
              const message = util.format('##### invokeChaincode - The invoke chaincode transaction was invalid, code:%s', code);
              console.error(message);
              return reject(new Error(message));
            }
            const message = '##### invokeChaincode - The invoke chaincode transaction was valid.';
            console.info(message);
            return resolve(message);
          }, (err) => {
            clearTimeout(eventTimeout);
            console.error(err);
            reject(err);
          },
          // the default for 'unregister' is true for transaction listeners
          // so no real need to set here, however for 'disconnect'
          // the default is false as most event hubs are long running
          // in this use case we are using it only once
          { unregister: true, disconnect: true });
          eh.connect();
        });
        promises.push(invokeEventPromise);
      });

      const ordererRequest = {
        txId: transactionId,
        proposalResponses,
        proposal,
      };
      const sendPromise = channel.sendTransaction(ordererRequest);
      // put the send to the ordering service last so that the events get registered and
      // are ready for the orderering and committing
      promises.push(sendPromise);
      const results = await Promise.all(promises);
      console.info(util.format('##### invokeChaincode ------->>> R E S P O N S E : %j', results));
      const response = results.pop(); //  ordering service results are last in the results
      if (response.status === 'SUCCESS') {
        console.info('##### invokeChaincode - Successfully sent transaction to the ordering service.');
      } else {
        errorMessage = util.format('##### invokeChaincode - Failed to order the transaction. Error code: %s', response.status);
        errorMessageDisplayable = response.status;
        console.info(errorMessage);
      }

      // now see what each of the event hubs reported
      for (const i in results) {
        const eventHubResult = results[i];
        const eventHub = eventHubs[i];
        console.info('##### invokeChaincode - Event results for event hub :%s', eventHub.getPeerAddr());
        if (typeof eventHubResult === 'string') {
          console.info(`##### invokeChaincode - ${eventHubResult}`);
        } else {
          if (!errorMessage) errorMessage = eventHubResult.toString();
          console.info(`##### invokeChaincode - ${eventHubResult.toString()}`);
        }
      }
    } else {
      errorMessage = util.format(`##### invokeChaincode - Failed to send Proposal and receive all good ProposalResponse. Status code: ${
        proposalResponses[0].status}, ${
        proposalResponses[0].message}\n${
        proposalResponses[0].stack}`);
      console.info(errorMessage);
      errorMessageDisplayable = proposalResponses[0].message;
    }
  } catch (error) {
    console.error(error.stack ? `##### invokeChaincode - Failed to invoke due to error: ${error.stack}` : error);
    errorMessage = error.toString();
    errorMessageDisplayable = error.toString();
    retriable = true;
  }

  if (!errorMessage) {
    const message = util.format(
      '##### invokeChaincode - Successfully invoked chaincode %s, function %s, on the channel \'%s\' for transaction ID: %s',
      request.chaincodeId, request.fcn, request.chainId, transactionId.getTransactionID(),
    );
    console.info(message);
    const response = {};
    response.transactionId = transactionId.getTransactionID();
    return response;
  }

  const message = util.format('##### invokeChaincode - Failed to invoke chaincode :%s', errorMessage);
  console.error(message);
  const displayMessage = retriable ? `${errorMessageDisplayable}  Please retry your request.` : errorMessageDisplayable;
  throw new Error(displayMessage);
}

module.exports = invoke;
