/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import RolesWrapper from '../../../src/services/contract_wrappers/roles_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Roles Wrapper', () => {
  const address = '0xc0ffee';
  const defaultAccount = '0xdefAcc';
  let contractManagerMock;
  let rolesWrapper;

  describe('onboardedRole', () => {
    let getRoleStub;
    let getRoleCallStub;

    before(async () => {
      getRoleStub = sinon.stub();
      getRoleCallStub = sinon.stub();
      contractManagerMock = {
        rolesContract: async () => ({
          methods: {
            getOnboardedRole: getRoleStub
          }
        })
      };
      getRoleStub.returns({
        call: getRoleCallStub
      });
      rolesWrapper = new RolesWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      getRoleCallStub.resolves('1');
      const role = await rolesWrapper.onboardedRole(address);
      expect(getRoleStub).to.be.calledWith(address);
      expect(getRoleCallStub).to.be.calledOnce;
      expect(role).to.equal('1');
    });
  });

  describe('selfOnboardedRole', () => {
    beforeEach(() => {
      contractManagerMock = {
        defaultAddress: () => defaultAccount
      };
      rolesWrapper = new RolesWrapper(contractManagerMock);
      sinon.stub(rolesWrapper, 'onboardedRole').resolves('1');
    });

    it('calls onboardedRole with defaulAddress', async () => {
      expect(await rolesWrapper.selfOnboardedRole()).to.equal('1');
      expect(rolesWrapper.onboardedRole).to.be.calledOnceWith(defaultAccount);
    });
  });

  describe('nodeUrl', () => {
    const nodeUrl = 'url';
    let getUrlStub;
    let getUrlCallStub;

    before(async () => {
      getUrlStub = sinon.stub();
      getUrlCallStub = sinon.stub();
      contractManagerMock = {
        rolesContract: async () => ({
          methods: {
            getUrl: getUrlStub
          }
        })
      };
      getUrlStub.returns({
        call: getUrlCallStub.resolves(nodeUrl)
      });
      rolesWrapper = new RolesWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      const url = await rolesWrapper.nodeUrl(address);
      expect(getUrlStub).to.be.calledWith(address);
      expect(getUrlCallStub).to.be.calledOnce;
      expect(url).to.equal(nodeUrl);
    });
  });

  describe('onboardAsAtlas', () => {
    let onboardAsAtlasStub;
    let onboardAsAtlasSendStub;
    const stake = '100';
    const url = 'url';

    beforeEach(async () => {
      onboardAsAtlasStub = sinon.stub();
      onboardAsAtlasSendStub = sinon.stub();
      contractManagerMock = {
        rolesContract: async () => ({
          methods: {
            onboardAsAtlas: onboardAsAtlasStub
          }
        })
      };
      onboardAsAtlasStub.returns({
        send: onboardAsAtlasSendStub
      });
      rolesWrapper = new RolesWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      await rolesWrapper.onboardAsAtlas(address, stake, url);
      expect(onboardAsAtlasStub).to.be.calledWith(url);
      expect(onboardAsAtlasSendStub).to.be.calledWith({
        from: address,
        value: stake
      });
    });
  });

  describe('onboardAsHermes', () => {
    let onboardAsHermesStub;
    let onboardAsHermesSendStub;
    const url = 'url';

    beforeEach(async () => {
      onboardAsHermesStub = sinon.stub();
      onboardAsHermesSendStub = sinon.stub();
      contractManagerMock = {
        rolesContract: async () => ({
          methods: {
            onboardAsHermes: onboardAsHermesStub
          }
        })
      };
      onboardAsHermesStub.returns({
        send: onboardAsHermesSendStub
      });
      rolesWrapper = new RolesWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      await rolesWrapper.onboardAsHermes(address, url);
      expect(onboardAsHermesStub).to.be.calledWith(url);
      expect(onboardAsHermesSendStub).to.be.calledWith({
        from: address
      });
    });
  });
});
