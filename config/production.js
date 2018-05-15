/* eslint-disable header/header */
module.exports = {
  bundle: {
    registryContractAddress: require('./registryContractAddress.json')
  },
  web3 : { 
    nodePrivateKey: require('./nodePrivateKey.json')
  },
  // note: we have it here for the dev and test networks. Should be removed before deploying the production network 
  authorizationWithSecretEnabled: true
};
