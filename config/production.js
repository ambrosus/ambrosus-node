/* eslint-disable header/header */

const registryContractAddress = (
  process.env.BUNDLE_REGISTRY_CONTRACT_ADDRESS || require('./registryContractAddress.json')
);

module.exports = {
  bundle: {registryContractAddress},
  web3 : {
    nodePrivateKey: require('./nodePrivateKey.json')
  },
  // note: we have it here for the dev and test networks. Should be removed before deploying the production network
  authorizationWithSecretEnabled: true
};
