module.exports = {
  bundle: {
    registryContractAddress: require('./registryContractAddress.json')
  },
  server: {
    port: 9876
  },
  mongo: {
    dbUri: 'mongodb://localhost:27017/ambrosus_gateway_development',
    database: 'ambrosus_gateway_developemnt'
  },
  web3: {
    rpc: 'http://127.0.0.1:8545',
    nodePrivateKey: '0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7'
  },
  authorizationWithSecretEnabled: true
};
