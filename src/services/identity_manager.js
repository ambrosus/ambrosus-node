import serialize from '../utils/serialize';
import {ValidationError} from '../errors/errors';
import matchHexOfLength from '../utils/regex';

export default class IdentityManager {
  constructor(web3) {
    this.web3 = web3;
  }

  sign(privateKey, data) {
    if (!matchHexOfLength(privateKey, 64)) {
      throw new ValidationError(`Invalid private key format`);
    }
    const {signature} = this.web3.eth.accounts.sign(serialize(data), privateKey);
    return signature;
  }

  validateSignature(address, signature, data) {
    if (!matchHexOfLength(address, 40)) {
      throw new ValidationError(`Invalid address format`);
    }
    if (!matchHexOfLength(signature, 130)) {
      throw new ValidationError(`Invalid signature format`);
    }
    const serialized = serialize(data);
    const hash = this.web3.eth.accounts.hashMessage(serialized);
    const signer = this.web3.eth.accounts.recover(hash, signature);
    return address === signer;
  }
}
