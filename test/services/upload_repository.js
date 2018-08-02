/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import UploadRepository from '../../src/services/upload_repository';
import {getDefaultAddress} from '../../src/utils/web3_tools';

const {expect} = chai;

describe('Upload repository', () => {
  const bundleId = '0xc0ffee';
  const storagePeriods = 1;
  const getFeeForUploadStub = sinon.stub();
  const getFeeForUploadCallStub = sinon.stub();
  const registerBundleStub = sinon.stub();
  const registerBundleSendStub = sinon.stub();
  let uploadRepository;
  let contractManagerMock;
  const mockWeb3 = {eth: {defaultAccount: '0xc0ffee'}};

  beforeEach(async () => {
    contractManagerMock = {
      feesContract: async () => ({
        methods: {
          getFeeForUpload: getFeeForUploadStub
        }
      }),
      uploadsContract: async () => ({
        methods: {
          registerBundle: registerBundleStub
        }
      }),
      web3: mockWeb3
    };
    getFeeForUploadStub.returns({
      call: getFeeForUploadCallStub
    });
    registerBundleStub.returns({
      send: registerBundleSendStub
    });
    uploadRepository = new UploadRepository(contractManagerMock);
  });

  describe('Upload bundle', async () => {
    it('correctly gets the fee', async () => {
      await uploadRepository.uploadBundle(bundleId, storagePeriods);
      expect(getFeeForUploadStub).to.be.calledWith(storagePeriods);
    });

    it('correctly uploads bundle', async () => {
      const fee = 100;
      getFeeForUploadCallStub.resolves(fee);
      await uploadRepository.uploadBundle(bundleId, storagePeriods);
      expect(registerBundleStub).to.be.calledWith(bundleId, storagePeriods);
      expect(registerBundleSendStub).to.be.calledWith({from: getDefaultAddress(mockWeb3), value: fee});
    });

    it('returns upload transaction', async () => {
      const tx = {foo: 'bar'};
      registerBundleSendStub.resolves(tx);
      const result = await uploadRepository.uploadBundle(bundleId, storagePeriods);
      expect(result).to.equal(tx);
    });
  });
});
