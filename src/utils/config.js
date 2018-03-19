import config from 'config';

export default class Config {
  static get(path, pathValue) {
    return pathValue === undefined ? config.get(path) : pathValue;
  }

  static bundleFinalisationInterval() {
    return config.get('bundle.finalisationInterval');
  }

  static bundleRegistryContractAddress() {
    if (!config.has('bundle.registryContractAddress')) {
      return null;
    }
    return config.get('bundle.registryContractAddress');
  }

  static serverPort() {
    return Config.get('server.port', process.env.PORT);
  }

  static mongoDbUri() {
    return Config.get('mongo.db_uri', process.env.MONGODB_URI);
  }

  static mongoDbDatabase() {
    return Config.get('mongo.database', process.env.MONGODB_DATABASE);
  }

  static nodePrivateKey() {
    return Config.get('web3.nodePrivateKey', process.env.WEB3_NODEPRIVATEKEY);
  }

  static web3Rpc() {
    return Config.get('web3.rpc', process.env.WEB3_RPC);
  }

  static isAuthorizationWithSecretKeyEnabled() {
    return Config.get('authorizationWithSecretEnabled');
  }
}
