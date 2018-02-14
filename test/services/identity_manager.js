import chai from 'chai';
import IdentityManager from '../../src/services/identity_manager';
import {createWeb3} from '../../src/utils/web3_tools';
import {InvalidParametersError, ValidationError} from '../../src/errors/errors';
import {put} from '../../src/utils/dict_utils';

const {expect} = chai;

const exampleData = {
  one: {
    two: {
      three: '3',
      four: 4
    },
    five: false
  }
};

describe('Identity manager', () => {
  let identityManager;
  let web3;
  let account;

  beforeEach(async () => {
    web3 = await createWeb3();
    identityManager = new IdentityManager(web3);
    account = web3.eth.accounts.create();
  });

  describe('Signing', () => {
    const testAccount =
      {
        address: '0x2795c24B088EDe052174b5Fe9157892e7D7e58cc',
        privateKey: '0x22fd86011f7287f7d98e361ddd685f5ffd48ffd109b651e1578aae1f9c579863'
      };

    it('should compute signature', async () => {
      const signature = identityManager.sign(testAccount.privateKey, exampleData);
      const expected =
        '0x2b74b5356cd3b26595773bd9d6cc3dcdb5c473b145f51a058736a20eb9bace17670bc450cd766e80116381b3d250e3562f3dcb79c8a6f61d8eb6271d1195bbd21b';
      expect(signature).to.eq(expected);
    });

    it('signatures should be different for different data', () => {
      const signature1 = identityManager.sign(account.privateKey, exampleData);
      const signature2 = identityManager.sign(account.privateKey, put(exampleData, 'six', 6));
      expect(signature1).to.not.eq(signature2);
    });

    it('should throw if private key has wrong format', () => {
      expect(() => identityManager.sign('0x12312312321', exampleData)).to.throw(InvalidParametersError);
    });
  });

  describe('Validate signature', () => {
    let signature;

    beforeEach(() => {
      ({signature} = web3.eth.accounts.sign(identityManager.serializeForHashing(exampleData), account.privateKey));
    });

    it('should validate if signature is correct', () => {
      expect(() => identityManager.validateSignature(account.address, signature, exampleData)).to.not.throw();
    });

    it('should not validate if was signed by another address', () => {
      const otherAccount = web3.eth.accounts.create();
      expect(() => identityManager.validateSignature(otherAccount.address, signature, exampleData)).to.throw(ValidationError);
    });

    it('should not validate if data was modified after signing', () => {
      const modifiedData = put(exampleData, 'one.two.three', 42);
      expect(() => identityManager.validateSignature(account.address, signature, modifiedData)).to.throw(ValidationError);
    });

    it('should throw if wrong signature format', () => {
      expect(() => identityManager.validateSignature(account.address, '0x1312312312', exampleData)).to.throw(InvalidParametersError);
    });

    it('should throw is wrong address format', () => {
      expect(() => identityManager.validateSignature('0x1312312312', signature, exampleData)).to.throw(InvalidParametersError);
    });
  });

  describe('Create key pair', () => {
    it('should create an account', () => {
      const result = identityManager.createKeyPair();
      expect(result.address).to.match(/^0x[0-9-a-fA-F]{40}$/);
      expect(result.secret).to.match(/^0x[0-9-a-fA-F]{64}$/);
    });

    it('accounts should be unique', () => {
      const account1 = identityManager.createKeyPair();
      const account2 = identityManager.createKeyPair();
      expect(account1.address).not.to.eq(account2.address);
    });
  });    

  it('Calculating the hash of data', () => {
    // calculated from input using REPL
    const input = {one: {two: {three: '3', four: 4}}, five: false};
    const expectedHash = '0x1fa4bb07995e73c1c827c402d965726934c68d89581a1d4e5e8d02fb9fddcd9a';

    expect(identityManager.calculateHash(input)).to.equal(expectedHash);
  });

  it('Calculating a stable serialization', async () => {
    const serialized = identityManager.serializeForHashing({bar: {test1: 'test1', test2: [1, false], test3: 123}, foo: 'foo'});
    const expectedResult = '{\'bar\':{\'test1\':\'test1\',\'test2\':[1,false],\'test3\':123},\'foo\':\'foo\'}';
    expect(serialized).to.equal(expectedResult);
  });
});
