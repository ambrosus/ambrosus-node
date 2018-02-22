import base64url from 'base64url';
import {AuthenticationError} from '../errors/errors';

export default class TokenAuthenticator {
  constructor(web3) {
    this.web3 = web3;
  }

  generateToken(secret, timestamp) {
    const address = this.addressFromSecret(secret);
    const idData = {
      createdBy: address,
      validUntil: timestamp
    };
    return this.doGenerateToken(secret, idData);
  }

  decodeToken(token) {
    const decoded = this.decode(token);
    const message = this.web3.eth.accounts.hashMessage(this.encode(decoded.idData));
    const {signature} = decoded;    
    const recoverAddress = this.recover(message, signature);    
    if (recoverAddress.toLowerCase() !== decoded.idData.createdBy.toLowerCase()) {
      throw new AuthenticationError('Token sigature don\'t match createdBy.');
    }
    return decoded;
  }

  recover(message, signature) {
    try {
      return this.web3.eth.accounts.recover(message, signature);    
    } catch (_e) {
      throw new AuthenticationError('Unanable to recover siganture.');
    }
  }

  doGenerateToken(secret, idData) {
    const signature = this.sign(idData, secret);
    const payload = {signature, idData};
    return this.encode(payload);  
  }

  decode(token) {
    try {
      return JSON.parse(base64url.decode(token));
    } catch (_e) {
      throw new AuthenticationError('Unanable to decode token.');
    }
  }

  encode(data) {
    return base64url(JSON.stringify(data));
  }

  addressFromSecret(secret) {
    try {
      return this.web3.eth.accounts.privateKeyToAccount(secret).address.toLowerCase();
    } catch (_e) {
      throw new AuthenticationError('Invalid secret.');
    }
  }

  sign(data, secret) {
    return this.web3.eth.accounts.sign(this.encode(data), secret).signature;
  }
}

