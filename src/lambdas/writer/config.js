module.exports = {
  privateKeyArn: process.env.PRIVATE_KEY_ARN,
  signedCertArn: process.env.SIGNED_CERT_ARN,
  memberId: process.env.MEMBER_ID,
  memberName: process.env.MEMBER_NAME,
  caEndpoint: process.env.CA_ENDPOINT,
  ordererEndpoint: process.env.ORDERER_ENDPOINT,
  peerEndpoint: process.env.PEER_ENDPOINT,
  channelName: process.env.CHANNEL_NAME,
  chaincodeName: process.env.CHAINCODE_NAME,
};
