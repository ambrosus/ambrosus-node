import chai from 'chai';
import chaiString from 'chai-string';
import sinon from 'sinon';
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
  let clock;

  const ENCODED_TOKEN = 'eyJpZERhdGEiOnsiY3JlYXRlZEJ5IjoiMHg3NDJFNjJDQzdBMTlFZjdEOWM0NDMwNkMwN0ZBZDU0QjViRjZkNGJFIiwidmFsaWRVbnRpbCI6N30sInNpZ25hdHVyZSI6IjB4MmYxNWQ3ZDEzOWVhMWFhNWFiZjZlYjVmODhlZTQ1OGFkNjg3OTQ1NjNiZTRlZjk5MTg3ZmViY2VmMWE4YzIyNDc5MmM3Nzk0NmU1MjQ1M2NmNzk3NWYxY2VjNDQzYTUxZmUxMTdhMTliMDgzNDc1ODk5MTM5MTJiZTUxMzMwMzQxYyJ9';
  const SIGNATURE = '0x2f15d7d139ea1aa5abf6eb5f88ee458ad68794563be4ef99187febcef1a8c224792c77946e52453cf7975f1cec443a51fe117a19b08347589913912be51330341c';
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
    it('generate token throws InvalidParametersError if no validUntil', async () => {
      expect(() => authenticator.generateToken(pkPair.secret, undefined)).to.throw(InvalidParametersError);
    });

    it('generate token throws InvalidParametersError if validUntil is not integer', async () => {
      expect(() => authenticator.generateToken(pkPair.secret, '01.01.1970')).to.throw(InvalidParametersError);
    });

    it('generate token from invalid secret', async () => {
      expect(() => authenticator.generateToken('not-a-secret', 7)).to.throw(AuthenticationError);
    });

    it('generate token with past timestamp', async () => {
      expect(() => authenticator.generateToken(pkPair.secret, past)).to.throw(InvalidParametersError);
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
