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
import chaiAsPromised from 'chai-as-promised';
import {createBundle} from '../fixtures/assets_events';
import {ValidationError} from '../../src/errors/errors';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Upload repository', () => {
  let feesWrapperMock;
  let uploadsWrapperMock;
  let shelteringWrapperMock;
  let rolesWrapperMock;
  let configWrapperMock;
  let uploadRepository;

  describe('Upload bundle', async () => {
    const bundleId = '0xc0ffee';
    const storagePeriods = 3;
    const fee = '100';

    beforeEach(async () => {
      uploadsWrapperMock = {
        registerBundle: sinon.stub()
      };
      rolesWrapperMock = {
        selfOnboardedRole: sinon.stub().resolves('2')
      };
      feesWrapperMock = {
        feeForUpload: sinon.stub().resolves(fee),
        checkIfEnoughFunds: sinon.stub().resolves(true)
      };
      uploadRepository = new UploadRepository(uploadsWrapperMock, {}, rolesWrapperMock, feesWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      await uploadRepository.uploadBundle(bundleId, storagePeriods);
      expect(feesWrapperMock.feeForUpload).to.be.calledOnceWith(storagePeriods);
      expect(feesWrapperMock.checkIfEnoughFunds).to.be.calledOnceWith(fee);
      expect(rolesWrapperMock.selfOnboardedRole).to.be.calledOnceWith();
      expect(uploadsWrapperMock.registerBundle).to.be.calledOnceWith(bundleId, fee, storagePeriods);
    });

    it('throws if not enough funds', async () => {
      feesWrapperMock.checkIfEnoughFunds.resolves(false);
      await expect(uploadRepository.uploadBundle(bundleId, storagePeriods)).to.be.eventually.rejected;
    });

    it('throws if not onboarded as hermes', async () => {
      rolesWrapperMock.selfOnboardedRole.resolves('1');
      await expect(uploadRepository.uploadBundle(bundleId, storagePeriods)).to.be.eventually.rejected;
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

  describe('bundleSizeLimit', async () => {
    const sizeLimit = 42;

    beforeEach(async () => {
      configWrapperMock = {
        bundleSizeLimit: sinon.stub().resolves(42)
      };
      uploadRepository = new UploadRepository({}, {}, {}, {}, configWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      expect(await uploadRepository.bundleSizeLimit()).to.equal(sizeLimit);
      expect(configWrapperMock.bundleSizeLimit).to.be.calledOnceWith();
    });
  });

  describe('Verifying a bundle', async () => {
    const downloadedBundle = createBundle({}, ['first', 'second', 'third']);
    let uploadRepository;

    beforeEach(() => {
      configWrapperMock = {
        bundleSizeLimit: sinon.stub()
      };

      uploadRepository = new UploadRepository({}, {}, {}, {}, configWrapperMock);
    });

    it('passes for proper bundle', async () => {
      configWrapperMock.bundleSizeLimit.resolves(5);
      await expect(uploadRepository.verifyBundle(downloadedBundle)).to.be.fulfilled;
    });

    it('throws if downloaded bundle is too big', async () => {
      configWrapperMock.bundleSizeLimit.resolves(2);
      await expect(uploadRepository.verifyBundle(downloadedBundle)).to.be.rejectedWith(ValidationError, 'Bundle size surpasses the limit');
    });
  });
});
