import chai from 'chai';
import chaistring from 'chai-string';
import {createWeb3} from '../../src/utils/web3_tools';
import TokenAuthenticator from '../../src/utils/token_authenticator';
import pkPair from '../fixtures/pk_pair';
import {AuthenticationError} from '../../src/errors/errors';

const {expect} = chai;
chai.use(chaistring);

describe('TokenAuthenticator', () => {
  let authenticator;

  const ENCODED_TOKEN = 'eyJzaWduYXR1cmUiOiIweDBjNmFiYjVhYTNkYmJhZTMzMDJhNjkxMzlkNjU1ZGJkYmNjN2UzOTA0NDM2Y2UxOGQwZTAzYjRkNmZmMDRhMDUyODlkY2I2ZTdhMGYyZmMyNWZjMjU0M2E5ZmZmMTE2ODkwYjEwNjlkZWM3MmNhMTQ1NTUyMjBiZDIzMTRlNjJkMWIiLCJpZERhdGEiOnsiY3JlYXRlZEJ5IjoiMHg3NDJlNjJjYzdhMTllZjdkOWM0NDMwNmMwN2ZhZDU0YjViZjZkNGJlIiwidmFsaWRVbnRpbCI6N319';
  const SIGNATURE = '0x0c6abb5aa3dbbae3302a69139d655dbdbcc7e3904436ce18d0e03b4d6ff04a05289dcb6e7a0f2fc25fc2543a9fff116890b1069dec72ca14555220bd2314e62d1b';
  
  before(async () => {
    authenticator = new TokenAuthenticator(await createWeb3());
  });

  describe('Valid data', () => {
    it('generate token', () => {
      const token = authenticator.generateToken(pkPair.secret, 7);
      expect(token).to.eq(ENCODED_TOKEN);
    });

    it('decode token', () => {
      const result = authenticator.decodeToken(ENCODED_TOKEN);
      expect(result.idData.createdBy).to.equalIgnoreCase(pkPair.address);
      expect(result.idData.validUntil).to.eq(7);
      expect(result.signature).to.eq(SIGNATURE);
    });
  });

  describe('Invalid data', () => {
    it('generate token from invalid secret', async () => {
      expect(() => authenticator.generateToken('not-a-secret', 7)).to.throw(AuthenticationError);
    });

    it('decode token with invalid signature (different createdBy)', () => {
      const idData = {
        createdBy: '0xbadAdd6e55',
        validUntil: 7
      };  
      const token = authenticator.doGenerateToken(pkPair.secret, idData);
      expect(() => authenticator.decodeToken(token)).to.throw(AuthenticationError);      
    });

    it('decode token with invalid signature (different data validUntil)', () => {
      const idData = {
        createdBy: pkPair.address,
        validUntil: 7
      };
      const signature = authenticator.sign(idData, pkPair.secret);
      const payload = {signature, idData: {...idData, validUntil: 8}};
      const token =  authenticator.encode(payload);          
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
      const token =  authenticator.encode(payload);                
      expect(() => authenticator.decodeToken(token)).to.throw(AuthenticationError);            
    });
  });
});
