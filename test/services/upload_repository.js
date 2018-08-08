/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import UploadRepository from '../../src/services/upload_repository';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);
const {expect} = chai;

describe('Upload repository', () => {
  let feesWrapperMock;
  let uploadsWrapperMock;
  let uploadRepository;

  describe('Upload bundle', async () => {
    const bundleId = '0xc0ffee';
    const storagePeriods = 1;
    const fee = '100';

    beforeEach(async () => {
      uploadsWrapperMock = {
        registerBundle: sinon.stub()
      };
      feesWrapperMock = {
        feeForUpload: sinon.stub().resolves(fee)
      };
      uploadRepository = new UploadRepository(uploadsWrapperMock, feesWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      await uploadRepository.uploadBundle(bundleId, storagePeriods);
      expect(feesWrapperMock.feeForUpload).to.be.calledOnceWith(storagePeriods);
      expect(uploadsWrapperMock.registerBundle).to.be.calledOnceWith(bundleId, fee, storagePeriods);
    });
  });
});
