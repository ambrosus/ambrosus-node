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
});
