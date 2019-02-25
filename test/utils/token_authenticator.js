/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import chaiString from 'chai-string';
import sinon from 'sinon';
import {createWeb3} from '../../src/utils/web3_tools';
import TokenAuthenticator from '../../src/utils/token_authenticator';
import pkPair from '../fixtures/pk_pair';
import {AuthenticationError, ValidationError} from '../../src/errors/errors';
import IdentityManager from '../../src/services/identity_manager';

const {expect} = chai;
chai.use(chaiString);

describe('TokenAuthenticator', () => {
  let authenticator;
  let identityManager;
  let clock;

  const ENCODED_TOKEN = 'eyJpZERhdGEiOnsiY3JlYXRlZEJ5IjoiMHg3NDJFNjJDQzdBMTlFZjdEOWM0NDMwNkMwN0ZBZDU0QjViRjZkNGJFIiwidmFsaWRVbnRpbCI6N30sInNpZ25hdHVyZSI6IjB4MjgxZWExOWZlM2QzMDcxMjliY2QyYTFhYmMzM2NmZGM4OWU3Yzc5OWMxNWFhZDM1ODIyYmI3MjdjNGJjZTFiMTA4YTc0ZWZjMjQ0ZjIyZGY1YjUyZDk0OTFlZmIzOTAxMTQ1MzgzMzFkNzU4MTM1Mjg1NGJkMzViN2UxZWNhNzExYyJ9';
  const SIGNATURE = '0x281ea19fe3d307129bcd2a1abc33cfdc89e7c799c15aad35822bb727c4bce1b108a74efc244f22df5b52d9491efb390114538331d7581352854bd35b7e1eca711c';
  const now = 6;
  const future = 7;
  const past = 5;

  before(async () => {
    identityManager = new IdentityManager(await createWeb3());
    authenticator = new TokenAuthenticator(identityManager);
    clock = sinon.useFakeTimers(now * 1000);
  });

  describe('Valid data', () => {
    it('generate token', () => {
      const token = authenticator.generateToken(pkPair.secret, future);
      expect(token).to.eq(ENCODED_TOKEN);
    });

    it('decode token', () => {
      const result = authenticator.decodeToken(ENCODED_TOKEN, now);
      expect(result.idData.createdBy).to.equalIgnoreCase(pkPair.address);
      expect(result.idData.validUntil).to.eq(7);
      expect(result.signature).to.eq(SIGNATURE);
    });
  });

  describe('Invalid data', () => {
    it('generate token throws ValidationError if no validUntil', async () => {
      expect(() => authenticator.generateToken(pkPair.secret, undefined)).to.throw(ValidationError);
    });

    it('generate token throws ValidationError if validUntil is not integer', async () => {
      expect(() => authenticator.generateToken(pkPair.secret, '01.01.1970')).to.throw(ValidationError);
    });

    it('generate token from invalid secret', async () => {
      expect(() => authenticator.generateToken('not-a-secret', 7)).to.throw(AuthenticationError);
    });

    it('generate token with past timestamp', async () => {
      expect(() => authenticator.generateToken(pkPair.secret, past)).to.throw(ValidationError);
    });

    it('decode token which is not base64', () => {
      expect(() => authenticator.decodeToken('notbase64')).to.throw(AuthenticationError);
    });

    it('decode token with invalid signature (different createdBy)', () => {
      const idData = {
        createdBy: '0xbadAdd6e55',
        validUntil: 7
      };
      const token = authenticator.encode(authenticator.preparePayload(pkPair.secret, idData));
      expect(() => authenticator.decodeToken(token)).to.throw(ValidationError);
    });

    it('decode token with invalid signature (different data validUntil)', () => {
      const idData = {
        createdBy: pkPair.address,
        validUntil: 7
      };
      const signature = identityManager.sign(pkPair.secret, idData);
      const payload = {signature, idData: {...idData, validUntil: 8}};
      const token = authenticator.encode(payload);
      expect(() => authenticator.decodeToken(token)).to.throw(AuthenticationError);
    });

    it('decode token with invalid format', () => {
      expect(() => authenticator.decodeToken('notarealtoken')).to.throw(AuthenticationError);
    });

    it('decode token with invalid signature (non-recoverable)', () => {
      const idData = {
        createdBy: pkPair.address,
        validUntil: 7
      };
      const signature = 'fake';
      const payload = {signature, idData: {...idData, validUntil: 8}};
      const token = authenticator.encode(payload);
      expect(() => authenticator.decodeToken(token)).to.throw(ValidationError);
    });

    it('decode expired token', () => {
      const token = authenticator.generateToken(pkPair.secret, future);
      expect(() => authenticator.decodeToken(token, future + 1)).to.throw(AuthenticationError);
    });

    it('decode token with missing validUntil', () => {
      const idData = {
        createdBy: pkPair.address
      };
      const token = authenticator.encode(authenticator.preparePayload(pkPair.secret, idData));
      expect(() => authenticator.decodeToken(token, now)).to.throw(AuthenticationError);
    });

    after(() => {
      clock.restore();
    });
  });
});
