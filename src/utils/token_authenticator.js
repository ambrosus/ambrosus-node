/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import base64url from 'base64url';
import {AuthenticationError, ValidationError} from '../errors/errors';
import {getTimestamp} from './time_utils';

export default class TokenAuthenticator {
  constructor(identityManager) {
    this.identityManager = identityManager;
  }

  generateToken(secret, timestamp) {
    if (!timestamp || !Number.isInteger(timestamp)) {
      throw new ValidationError('Unix timestamp was not provided or has an invalid format');
    }
    if (timestamp <= getTimestamp()) {
      throw new ValidationError('The token has expired.');
    }
    const address = this.identityManager.addressFromSecret(secret);
    const idData = {
      createdBy: address,
      validUntil: timestamp
    };
    return this.encode(this.preparePayload(secret, idData));
  }

  decodeToken(token, timeNow = getTimestamp()) {
    const decoded = this.decode(token);
    const {signature, idData} = decoded;
    this.identityManager.validateSignature(idData.createdBy, signature, idData);
    if (!decoded.idData.validUntil) {
      throw new AuthenticationError('Invalid token, no expiration date.');
    }
    if (decoded.idData.validUntil < timeNow) {
      throw new AuthenticationError('Token has expired.');
    }

    return decoded;
  }

  preparePayload(secret, idData) {
    const signature = this.identityManager.sign(secret, idData);
    const payload = {signature, idData};
    return payload;
  }

  decode(token) {
    try {
      return JSON.parse(base64url.decode(token));
    } catch (_e) {
      throw new AuthenticationError('Unable to decode token.');
    }
  }

  encode(data) {
    return base64url(this.identityManager.serializeForHashing(data));
  }
}
