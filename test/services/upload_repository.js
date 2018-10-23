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
  const bundleId = '0xc0ffee';
  let feesWrapperMock;
  let uploadsActionsMock;
  let shelteringWrapperMock;
  let rolesWrapperMock;
  let configWrapperMock;
  let uploadRepository;
  let identityManagerMock;
  let web3Mock;

  describe('Upload bundle', async () => {
    const storagePeriods = 3;
    const fee = '100';
    const tooSmallBalance = '99';
    const exampleAddress = '0xdeadface';

    beforeEach(async () => {
      uploadsActionsMock = {
        uploadBundle: sinon.stub()
      };
      rolesWrapperMock = {
        onboardedRole: sinon.stub().resolves('2')
      };
      feesWrapperMock = {
        feeForUpload: sinon.stub().resolves(fee)
      };
      identityManagerMock = {
        nodeAddress: sinon.stub().returns(exampleAddress)
      };
      web3Mock = {
        eth: {
          getBalance: sinon.stub().resolves(fee)
        }
      };
      uploadRepository = new UploadRepository(web3Mock, identityManagerMock, uploadsActionsMock, {}, rolesWrapperMock, feesWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      await uploadRepository.uploadBundle(bundleId, storagePeriods);
      expect(feesWrapperMock.feeForUpload).to.be.calledOnceWith(storagePeriods);
      expect(web3Mock.eth.getBalance).to.be.calledOnceWith(exampleAddress);
      expect(rolesWrapperMock.onboardedRole).to.be.calledOnceWith(exampleAddress);
      expect(identityManagerMock.nodeAddress).to.have.been.called;
      expect(uploadsActionsMock.uploadBundle).to.be.calledOnceWith(bundleId, storagePeriods);
    });

    it('throws if not enough funds', async () => {
      web3Mock.eth.getBalance.resolves(tooSmallBalance);
      await expect(uploadRepository.uploadBundle(bundleId, storagePeriods)).to.be.eventually.rejected;
    });

    it('throws if not onboarded as hermes', async () => {
      rolesWrapperMock.onboardedRole.resolves('1');
      await expect(uploadRepository.uploadBundle(bundleId, storagePeriods)).to.be.eventually.rejected;
    });
  });

  describe('Get bundle chain data', () => {
    const exampleUploadData = 'data';

    beforeEach(() => {
      uploadsActionsMock = {
        getBundleUploadData: sinon.stub().resolves(exampleUploadData)
      };
      uploadRepository = new UploadRepository({}, {}, uploadsActionsMock);
    });

    it('should call upload actions method', async () => {
      expect(await uploadRepository.getBundleChainData(bundleId)).to.equal(exampleUploadData);
      expect(uploadsActionsMock.getBundleUploadData).to.be.calledOnceWith(bundleId);
    });
  });

  describe('isSheltering', async () => {
    beforeEach(async () => {
      shelteringWrapperMock = {
        isSheltering: sinon.stub().resolves(true)
      };
      uploadRepository = new UploadRepository({}, {}, {}, shelteringWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      expect(await uploadRepository.isSheltering(bundleId)).to.equal(true);
      expect(shelteringWrapperMock.isSheltering).to.be.calledOnceWith(bundleId);
    });
  });

  describe('expirationDate', async () => {
    const expirationDate = 123;

    beforeEach(async () => {
      shelteringWrapperMock = {
        shelteringExpirationDate: sinon.stub().resolves(expirationDate)
      };
      uploadRepository = new UploadRepository({}, {}, {}, shelteringWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      expect(await uploadRepository.expirationDate(bundleId)).to.equal(expirationDate);
      expect(shelteringWrapperMock.shelteringExpirationDate).to.be.calledOnceWith(bundleId);
    });
  });

  describe('bundleItemsCountLimit', async () => {
    const sizeLimit = 42;

    beforeEach(async () => {
      configWrapperMock = {
        bundleSizeLimit: sinon.stub().resolves(sizeLimit)
      };
      uploadRepository = new UploadRepository({}, {}, {}, {}, {}, {}, configWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      expect(await uploadRepository.bundleItemsCountLimit()).to.equal(sizeLimit);
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

      uploadRepository = new UploadRepository({}, {}, {}, {}, {}, {}, configWrapperMock);
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
