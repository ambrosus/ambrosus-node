import {InvalidParametersError, AuthenticationError} from '../errors/errors';
import matchHexOfLength from '../utils/regex';
import {getDefaultPrivateKey, getDefaultAddress} from '../utils/web3_tools';

export default class IdentityManager {
  constructor(web3) {
    this.web3 = web3;
  }

  async nodePrivateKey() {
    return await getDefaultPrivateKey(this.web3);
  }

  nodeAddress() {
    return getDefaultAddress(this.web3);
  }

  sign(privateKey, data) {
    if (!matchHexOfLength(privateKey, 64)) {
      throw new InvalidParametersError(`Invalid private key format`);
    }
    const {signature} = this.web3.eth.accounts.sign(this.calculateHash(data), privateKey);
    return signature;
  }

  validateSignature(address, signature, data) {
    if (!matchHexOfLength(address, 40)) {
      throw new InvalidParametersError(`Invalid address format`);
    }
    if (!matchHexOfLength(signature, 130)) {
      throw new InvalidParametersError(`Invalid signature format`);
    }
    const hash = this.calculateHash(data);
    const signer = this.web3.eth.accounts.recover(hash, signature);
    if (address.toLowerCase() !== signer.toLowerCase()) {
      throw new AuthenticationError(`Signature doesn't match`);
    }
  }

  calculateHash(data) {
    const serialized = this.serializeForHashing(data);
    return this.web3.eth.accounts.hashMessage(serialized);
  }

  serializeForHashing(object) {
    const isDict = (subject) => typeof subject === 'object' && !Array.isArray(subject);
    const isString = (subject) => typeof subject === 'string';
    const isArray = (subject) => Array.isArray(subject);

    if (isDict(object)) {
      const content = Object
        .keys(object)
        .sort()
        .map((key) => `"${key}":${this.serializeForHashing(object[key])}`)
        .join(',');
      return `{${content}}`;
    } else if (isArray(object)) {
      const content = object.map((item) => this.serializeForHashing(item)).join(',');
      return `[${content}]`;
    } else if (isString(object)) {
      return `"${object}"`;
    }
    return object.toString();
  }

  createKeyPair() {
    const account = this.web3.eth.accounts.create();
    return {address: account.address, secret: account.privateKey};
  }

  addressFromSecret(secret) {
    try {
      return this.web3.eth.accounts.privateKeyToAccount(secret).address;
    } catch (_e) {
      throw new AuthenticationError('Invalid secret.');
    }
  }
}
