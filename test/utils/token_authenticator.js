import chai from 'chai';
import chaiString from 'chai-string';
import {createWeb3} from '../../src/utils/web3_tools';
import TokenAuthenticator from '../../src/utils/token_authenticator';
import pkPair from '../fixtures/pk_pair';
import {AuthenticationError, InvalidParametersError} from '../../src/errors/errors';
import IdentityManager from '../../src/services/identity_manager';

const {expect} = chai;
chai.use(chaiString);

describe('TokenAuthenticator', () => {
  let authenticator;
  let identityManager;

  const ENCODED_TOKEN = 'eyJpZERhdGEiOnsiY3JlYXRlZEJ5IjoiMHg3NDJlNjJjYzdhMTllZjdkOWM0NDMwNmMwN2ZhZDU0YjViZjZkNGJlIiwidmFsaWRVbnRpbCI6N30sInNpZ25hdHVyZSI6IjB4OWY2YzM5MTA2OWUwMDVhMjc3ZTk5MGFlMjA0Mzk4MmZmOGU4ZDcxZWZlZjA4NzU3Yzg5ZWY5NjhhYzBmZjczZjI3MTU3ZWFhNjI2MDhiZTdhNzRhMjRkODM3MzdiNjVhMWUxMTE4NjY4NzY3ZmQzNDAwNDU4ZTgwM2I1ODBlZjMxYyJ9';
  const SIGNATURE = '0x9f6c391069e005a277e990ae2043982ff8e8d71efef08757c89ef968ac0ff73f27157eaa62608be7a74a24d83737b65a1e1118668767fd3400458e803b580ef31c';
  const now = 6;
  const future = 7;
  const past = 5;

  before(async () => {
    identityManager = new IdentityManager(await createWeb3());
    authenticator = new TokenAuthenticator(identityManager);
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
    it('generate token throws InvalidParametersError if no validUntil', async () => {
      expect(() => authenticator.generateToken(pkPair.secret, undefined)).to.throw(InvalidParametersError);
    });

    it('generate token throws InvalidParametersError if validUntil is not integer', async () => {
      expect(() => authenticator.generateToken(pkPair.secret, '01.01.1970')).to.throw(InvalidParametersError);
    });

    it('generate token from invalid secret', async () => {
      expect(() => authenticator.generateToken('not-a-secret', 7)).to.throw(AuthenticationError);
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
      expect(() => authenticator.decodeToken(token)).to.throw(InvalidParametersError);
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
      expect(() => authenticator.decodeToken(token)).to.throw(InvalidParametersError);
    });

    it('decode expired token', () => {
      const token = authenticator.generateToken(pkPair.secret, past);
      expect(() => authenticator.decodeToken(token, now)).to.throw(AuthenticationError);
    });

    it('decode token with missing validUntil', () => {
      const idData = {
        createdBy: pkPair.address
      };
      const token = authenticator.encode(authenticator.preparePayload(pkPair.secret, idData));
      expect(() => authenticator.decodeToken(token, now)).to.throw(AuthenticationError);
    });
  });
});
