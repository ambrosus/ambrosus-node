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
import {createBundle} from '../fixtures/assets_events';
import {ValidationError} from '../../src/errors/errors';

chai.use(sinonChai);
const {expect} = chai;

describe('Upload repository', () => {
  let feesWrapperMock;
  let uploadsWrapperMock;
  let shelteringWrapperMock;
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
      uploadRepository = new UploadRepository(uploadsWrapperMock, {}, feesWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      await uploadRepository.uploadBundle(bundleId, storagePeriods);
      expect(feesWrapperMock.feeForUpload).to.be.calledOnceWith(storagePeriods);
      expect(uploadsWrapperMock.registerBundle).to.be.calledOnceWith(bundleId, fee, storagePeriods);
    });
  });

  describe('isSheltering', async () => {
    const bundleId = '0xc0ffee';

    beforeEach(async () => {
      shelteringWrapperMock = {
        isSheltering: sinon.stub().resolves(true)
      };
      uploadRepository = new UploadRepository({}, shelteringWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      expect(await uploadRepository.isSheltering(bundleId)).to.equal(true);
      expect(shelteringWrapperMock.isSheltering).to.be.calledOnceWith(bundleId);
    });
  });

  describe('expirationDate', async () => {
    const bundleId = '0xc0ffee';
    const exoirationDate = 123;

    beforeEach(async () => {
      shelteringWrapperMock = {
        shelteringExpirationDate: sinon.stub().resolves(123)
      };
      uploadRepository = new UploadRepository({}, shelteringWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      expect(await uploadRepository.expirationDate(bundleId)).to.equal(exoirationDate);
      expect(shelteringWrapperMock.shelteringExpirationDate).to.be.calledOnceWith(bundleId);
    });
  });

  describe('Verifying a bundle', async () => {
    const downloadedBundle = createBundle({}, ['first', 'second', 'third']);
    let mockConfigWrapper;
    let uploadRepository;

    beforeEach(() => {
      mockConfigWrapper = {
        bundleSizeLimit: sinon.stub()
      };

      uploadRepository = new UploadRepository({}, {}, {}, mockConfigWrapper);
    });

    it('passes for proper bundle', async () => {
      mockConfigWrapper.bundleSizeLimit.resolves(5);
      await expect(uploadRepository.verifyBundle(downloadedBundle)).to.be.fulfilled;
    });

    it('throws if downloaded bundle is to big', async () => {
      mockConfigWrapper.bundleSizeLimit.resolves(2);
      await expect(uploadRepository.verifyBundle(downloadedBundle)).to.be.rejectedWith(ValidationError, 'Bundle size surpasses the limit');
    });
  });
});
