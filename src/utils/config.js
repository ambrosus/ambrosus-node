import config from 'config';

export default class Config {
  constructor(attributes = {}) {
    this.attributes = attributes;
  }

  withAttributes(attributes = {}) {
    this.attributes = {...this.attributes, ...attributes};
    return this;
  }

  bundleFinalisationInterval() {
    return config.get('bundle.finalisationInterval');
  }

  bundleDownloadInterval() {
    return config.get('bundle.downloadInterval');
  }

  bundleRegistryContractAddress() {
    if (this.attributes.bundleRegistryContractAddress) {
      return this.attributes.bundleRegistryContractAddress;
    }
    if (!config.has('bundle.registryContractAddress')) {
      return null;
    }
    return config.get('bundle.registryContractAddress');
  }

  serverPort() {
    return process.env.PORT || config.get('server.port');
  }

  mongoUri() {
    return this.attributes.mongoUri || process.env.MONGODB_URI || config.get('mongoUri');
  }

  nodePrivateKey() {
    return process.env.WEB3_NODEPRIVATEKEY || config.get('web3.nodePrivateKey');
  }

  web3Rpc() {
    return process.env.WEB3_RPC || config.get('web3.rpc');
  }

  isAuthorizationWithSecretKeyEnabled() {
    if (this.attributes.isAuthorizationWithSecretKeyEnabled === false) {
      return false;
    }
    return config.get('authorizationWithSecretEnabled');
  }

  static default(attributes) {
    return new Config(attributes);
  }
}
