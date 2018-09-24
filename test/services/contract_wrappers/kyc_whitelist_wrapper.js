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
import KycWhitelistWrapper from '../../../src/services/contract_wrappers/kyc_whitelist_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('KYC Whitelist Wrapper', () => {
  let getContractStub;
  let kycWhitelistWrapper;
  const defaultAddress = '0x6789';
  const exampleAddress = '0x1234';
  const exampleRole = 2;
  const exampleRequiredDeposit = 10000;

  describe('add', () => {
    let addStub;
    let addSendStub;

    before(async () => {
      addStub = sinon.stub();
      addSendStub = sinon.stub();
      const contractMock = {
        methods: {
          add: addStub.returns({
            send: addSendStub.resolves()
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper({}, {}, defaultAddress);
      getContractStub = sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    after(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.add(exampleAddress, exampleRole, exampleRequiredDeposit);
      expect(addStub).to.be.calledWith(exampleAddress, exampleRole, exampleRequiredDeposit);
      expect(addSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });

  describe('remove', () => {
    let removeStub;
    let removeSendStub;

    before(async () => {
      removeStub = sinon.stub();
      removeSendStub = sinon.stub();
      const contractMock = {
        methods: {
          remove: removeStub.returns({
            send: removeSendStub.resolves()
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper({}, {}, defaultAddress);
      getContractStub = sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    after(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.remove(exampleAddress);
      expect(removeStub).to.be.calledWith(exampleAddress);
      expect(removeSendStub).to.be.calledOnceWith({from: defaultAddress});
    });
  });

  describe('isWhitelisted', () => {
    let isWhitelistedStub;
    let isWhitelistedCallStub;

    before(async () => {
      isWhitelistedStub = sinon.stub();
      isWhitelistedCallStub = sinon.stub();
      const contractMock = {
        methods: {
          isWhitelisted: isWhitelistedStub.returns({
            call: isWhitelistedCallStub.resolves(1)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper();
      getContractStub = sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    after(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      const ret = await kycWhitelistWrapper.isWhitelisted(exampleAddress);
      expect(isWhitelistedStub).to.be.calledWith(exampleAddress);
      expect(isWhitelistedCallStub).to.be.calledOnce;
      expect(ret).to.equal(1);
    });
  });

  describe('hasRoleAssigned', () => {
    let hasRoleAssignedStub;
    let hasRoleAssignedCallStub;

    before(async () => {
      hasRoleAssignedStub = sinon.stub();
      hasRoleAssignedCallStub = sinon.stub();
      const contractMock = {
        methods: {
          hasRoleAssigned: hasRoleAssignedStub.returns({
            call: hasRoleAssignedCallStub.resolves(1)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper();
      getContractStub = sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    after(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.hasRoleAssigned(exampleAddress, exampleRole);
      expect(hasRoleAssignedStub).to.be.calledWith(exampleAddress, exampleRole);
      expect(hasRoleAssignedCallStub).to.be.calledOnce;
    });
  });

  describe('selfHasRoleAssigned', () => {
    let selfHasRoleAssignedStub;
    let selfHasRoleAssignedCallStub;

    before(async () => {
      selfHasRoleAssignedStub = sinon.stub();
      selfHasRoleAssignedCallStub = sinon.stub();
      const contractMock = {
        methods: {
          hasRoleAssigned: selfHasRoleAssignedStub.returns({
            call: selfHasRoleAssignedCallStub.resolves(1)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper({}, {}, exampleAddress);
      getContractStub = sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    after(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.selfHasRoleAssigned(exampleRole);
      expect(selfHasRoleAssignedStub).to.be.calledWith(exampleAddress, exampleRole);
      expect(selfHasRoleAssignedCallStub).to.be.calledOnce;
    });
  });

  describe('getRequiredDeposit', () => {
    let getRequiredDepositStub;
    let getRequiredDepositCallStub;

    before(async () => {
      getRequiredDepositStub = sinon.stub();
      getRequiredDepositCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getRequiredDeposit: getRequiredDepositStub.returns({
            call: getRequiredDepositCallStub.resolves(exampleRequiredDeposit)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper();
      getContractStub = sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    after(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.getRequiredDeposit(exampleAddress);
      expect(getRequiredDepositStub).to.be.calledWith(exampleAddress);
      expect(getRequiredDepositCallStub).to.be.calledOnce;
    });
  });

  describe('selfGetRequiredDeposit', () => {
    let selfGetRequiredDepositStub;
    let selfGetRequiredDepositCallStub;

    before(async () => {
      selfGetRequiredDepositStub = sinon.stub();
      selfGetRequiredDepositCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getRequiredDeposit: selfGetRequiredDepositStub.returns({
            call: selfGetRequiredDepositCallStub.resolves(exampleRequiredDeposit)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper({}, {}, exampleAddress);
      getContractStub = sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    after(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.selfGetRequiredDeposit();
      expect(selfGetRequiredDepositStub).to.be.calledWith(exampleAddress);
      expect(selfGetRequiredDepositCallStub).to.be.calledOnce;
    });
  });

  describe('getRoleAssigned', () => {
    let getRoleAssignedStub;
    let getRoleAssignedCallStub;

    before(async () => {
      getRoleAssignedStub = sinon.stub();
      getRoleAssignedCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getRoleAssigned: getRoleAssignedStub.returns({
            call: getRoleAssignedCallStub.resolves(exampleRole)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper();
      getContractStub = sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    after(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.getRoleAssigned(exampleAddress);
      expect(getRoleAssignedStub).to.be.calledWith(exampleAddress);
      expect(getRoleAssignedCallStub).to.be.calledOnce;
    });
  });

  describe('selfGetRoleAssigned', () => {
    let selfGetRoleAssignedStub;
    let selfGetRoleAssignedCallStub;

    before(async () => {
      selfGetRoleAssignedStub = sinon.stub();
      selfGetRoleAssignedCallStub = sinon.stub();
      const contractMock = {
        methods: {
          getRoleAssigned: selfGetRoleAssignedStub.returns({
            call: selfGetRoleAssignedCallStub.resolves(exampleRole)
          })
        }
      };
      kycWhitelistWrapper = new KycWhitelistWrapper({}, {}, exampleAddress);
      getContractStub = sinon.stub(kycWhitelistWrapper, 'contract').resolves(contractMock);
    });

    after(async () => {
      getContractStub.restore();
    });

    it('calls contract method with correct arguments', async () => {
      await kycWhitelistWrapper.selfGetRoleAssigned();
      expect(selfGetRoleAssignedStub).to.be.calledWith(exampleAddress);
      expect(selfGetRoleAssignedCallStub).to.be.calledOnce;
    });
  });
});
