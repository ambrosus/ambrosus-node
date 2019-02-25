/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import IdentityManager from '../../src/services/identity_manager';
import {createWeb3} from '../../src/utils/web3_tools';
import {ValidationError, AuthenticationError} from '../../src/errors/errors';
import {put} from '../../src/utils/dict_utils';
import pkPair from '../fixtures/pk_pair';

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
        '0x60b04901cd87535336eb810de3a4c7504f0f0718780a25a2beb01bbc00b66ade77ac9c013c27ff037538d5502d34cfb5de667175c1391ba8b69a82771efb286f1b';
      expect(signature).to.eq(expected);
    });

    it('signatures should be different for different data', () => {
      const signature1 = identityManager.sign(account.privateKey, exampleData);
      const signature2 = identityManager.sign(account.privateKey, put(exampleData, 'six', 6));
      expect(signature1).to.not.eq(signature2);
    });

    it('throws if private key has wrong format', () => {
      expect(() => identityManager.sign('0x12312312321', exampleData)).to.throw(ValidationError);
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
      expect(() => identityManager.validateSignature(otherAccount.address, signature, exampleData)).to.throw(AuthenticationError);
    });

    it('should not validate if data was modified after signing', () => {
      const modifiedData = put(exampleData, 'one.two.three', 42);
      expect(() => identityManager.validateSignature(account.address, signature, modifiedData)).to.throw(AuthenticationError);
    });

    it('throws if wrong signature format', () => {
      expect(() => identityManager.validateSignature(account.address, '0x1312312312', exampleData)).to.throw(ValidationError);
    });

    it('throws is wrong address format', () => {
      expect(() => identityManager.validateSignature('0x1312312312', signature, exampleData)).to.throw(ValidationError);
    });
  });

  describe('Create key pair', () => {
    it('should create an account', () => {
      const result = identityManager.createKeyPair();
      expect(result.address).to.be.properAddress;
      expect(result.secret).to.be.properSecret;
    });

    it('accounts should be unique', () => {
      const account1 = identityManager.createKeyPair();
      const account2 = identityManager.createKeyPair();
      expect(account1.address).not.to.eq(account2.address);
    });
  });

  describe('Gets address from secret', () => {
    it('should get address from secret', () => {
      const address = identityManager.addressFromSecret(pkPair.secret);
      expect(address).to.eq(pkPair.address);
    });

    it('throws if invalid secret', () => {
      expect(() => identityManager.addressFromSecret('badSecret')).to.throw(AuthenticationError);
    });
  });

  it('Calculating the hash of data', () => {
    // calculated from input using REPL
    const input = {one: {two: {three: '3', four: 4}}, five: false};
    const expectedHash = '0x1a9a56b79d8e360cf056f04ea43869479fdf79f60f72d5a6e9bda0eea7bbe947';

    expect(identityManager.calculateHash(input)).to.equal(expectedHash);
  });

  it('Checking provided hash value against hash of data', () => {
    const input = {one: {two: {three: '3', four: 4}}, five: false};
    const expectedHash = '0x1a9a56b79d8e360cf056f04ea43869479fdf79f60f72d5a6e9bda0eea7bbe947';
    const otherHash = '0x5a2a56b79d8e360cf056f04ea43869479fdf79f60f72d5a6e9bda0eea7bbe947';

    expect(identityManager.checkHashMatches(expectedHash, input)).to.be.true;
    expect(identityManager.checkHashMatches(otherHash, input)).to.be.false;
  });

  it('Calculating a stable serialization', async () => {
    const serialized = identityManager.serializeForHashing({bar: {test1: 'test1', test2: [1, false], test3: 123}, foo: 'foo'});
    const expectedResult = '{"bar":{"test1":"test1","test2":[1,false],"test3":123},"foo":"foo"}';
    expect(serialized).to.equal(expectedResult);
  });
});
