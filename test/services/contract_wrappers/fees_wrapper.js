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
import FeesWrapper from '../../../src/services/contract_wrappers/fees_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Fees Wrapper', () => {
  let contractManagerMock;
  let feesWrapper;

  describe('feeForUpload', () => {
    const storagePeriods = 23;
    const fee = '100';
    let getFeeForUploadStub;
    let getFeeForUploadCallStub;

    beforeEach(async () => {
      getFeeForUploadStub = sinon.stub();
      getFeeForUploadCallStub = sinon.stub();
      contractManagerMock = {
        feesContract: async () => ({
          methods: {
            getFeeForUpload: getFeeForUploadStub
          }
        })
      };
      getFeeForUploadStub.returns({
        call: getFeeForUploadCallStub.resolves(fee)
      });
      feesWrapper = new FeesWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await feesWrapper.feeForUpload(storagePeriods)).to.equal(fee);
      expect(getFeeForUploadStub).to.be.calledOnceWith(storagePeriods);
      expect(getFeeForUploadCallStub).to.be.calledOnce;
    });
  });

  describe('checkIfEnoughFunds', () => {
    const balance = '100';
    const defaultAddress = '0xbeef';

    beforeEach(async () => {
      contractManagerMock = {
        web3: {
          eth: {
            getBalance: sinon.stub().resolves(balance)
          }
        },
        defaultAddress: () => defaultAddress
      };
      feesWrapper = new FeesWrapper(contractManagerMock);
    });

    it('calls getBalance with default address', async () => {
      await feesWrapper.checkIfEnoughFunds('99');
      expect(contractManagerMock.web3.eth.getBalance).to.be.calledOnceWith(defaultAddress);
    });

    it('returns true if fee ≤ balance', async () => {
      expect(await feesWrapper.checkIfEnoughFunds('99')).to.be.true;
      expect(await feesWrapper.checkIfEnoughFunds('100')).to.be.true;
    });

    it('returns false fee > balance', async () => {
      expect(await feesWrapper.checkIfEnoughFunds('101')).to.be.false;
    });
  });
});
