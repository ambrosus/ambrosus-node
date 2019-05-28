/*
Copyright: Ambrosus Inc.
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
import {InsufficientFundsToUploadBundleError} from 'ambrosus-node-contracts';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Upload repository', () => {
  const bundleId = '0xc0ffee';
  let uploadsActionsMock;
  let shelteringWrapperMock;
  let rolesWrapperMock;
  let configWrapperMock;
  let uploadRepository;
  let identityManagerMock;
  let web3Mock;
  let sentryMock;

  describe('Upload bundle', () => {
    const storagePeriods = 3;
    const fee = '100';
    const tooSmallBalance = '99';
    const exampleAddress = '0xdeadface';
    const exampleUploadData = {blockNumber: 34, transactionHash: '0x1ae35c49aa2423', timestamp: 420};


    beforeEach(() => {
      uploadsActionsMock = {
        uploadBundle: sinon.stub().resolves(exampleUploadData),
        getBundleUploadData: sinon.stub().resolves(exampleUploadData)
      };
      rolesWrapperMock = {
        onboardedRole: sinon.stub().resolves('2')
      };
      shelteringWrapperMock = {
        getBundleUploader: sinon.stub().resolves('0x0')
      };
      identityManagerMock = {
        nodeAddress: sinon.stub().returns(exampleAddress)
      };
      web3Mock = {
        eth: {
          getBalance: sinon.stub().resolves(fee)
        }
      };
      sentryMock = {
        captureException: sinon.stub(),
        captureMessage: sinon.stub(),
        Severity: {
          Warning: 1
        }
      };
      uploadRepository = new UploadRepository(web3Mock, identityManagerMock, uploadsActionsMock, shelteringWrapperMock, rolesWrapperMock, {}, sentryMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      await expect(uploadRepository.ensureBundleIsUploaded(bundleId, storagePeriods)).to.be.eventually.deep.equal({...exampleUploadData, uploadResult: 'Bundle has been uploaded'});
      expect(rolesWrapperMock.onboardedRole).to.be.calledOnceWith(exampleAddress);
      expect(identityManagerMock.nodeAddress).to.have.been.called;
      expect(shelteringWrapperMock.getBundleUploader).to.have.been.calledOnceWith(bundleId);
      expect(uploadsActionsMock.uploadBundle).to.be.calledOnceWith(bundleId, storagePeriods);
    });

    it('captures in Sentry if not enough funds and rethrows', async () => {
      uploadsActionsMock.uploadBundle.rejects(new InsufficientFundsToUploadBundleError(fee, tooSmallBalance));
      await expect(uploadRepository.ensureBundleIsUploaded(bundleId, storagePeriods)).to.be.eventually.rejected;
      expect(sentryMock.captureException).to.be.calledOnce;
    });

    it('throws other errors', async () => {
      uploadsActionsMock.uploadBundle.rejects(new Error('something else happened'));
      await expect(uploadRepository.ensureBundleIsUploaded(bundleId, storagePeriods)).to.be.eventually.rejected;
      expect(sentryMock.captureException).to.have.not.been.called;
    });

    it('logs low balance warning to Sentry', async () => {
      uploadsActionsMock.uploadBundle = sinon.stub().resolves({lowBalanceWarning: true, approximateBalanceAfterUpload: '11111111'});
      await expect(uploadRepository.ensureBundleIsUploaded(bundleId, storagePeriods)).to.be.eventually.fulfilled;
      expect(sentryMock.captureMessage).to.be.calledOnce;
    });

    it('throws if not onboarded as hermes', async () => {
      rolesWrapperMock.onboardedRole.resolves('1');
      await expect(uploadRepository.ensureBundleIsUploaded(bundleId, storagePeriods)).to.be.eventually.rejected;
    });

    it('throws if bundle was already uploaded by a different Hermes', async () => {
      shelteringWrapperMock.getBundleUploader.resolves('0x1234');
      await expect(uploadRepository.ensureBundleIsUploaded(bundleId, storagePeriods)).to.be.eventually.rejected;
    });

    it('fetches chain data if bundle was already uploaded by self', async () => {
      shelteringWrapperMock.getBundleUploader.resolves(exampleAddress);
      await expect(uploadRepository.ensureBundleIsUploaded(bundleId, storagePeriods)).to.be.eventually.deep.equal({...exampleUploadData, uploadResult: 'Bundle was already uploaded, updated metadata from chain'});
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

  describe('isSheltering', () => {
    beforeEach(() => {
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

  describe('bundleExpirationDateInMs', () => {
    const expirationDateInSeconds = '123';

    beforeEach(() => {
      shelteringWrapperMock = {
        shelteringExpirationDate: sinon.stub().resolves(expirationDateInSeconds)
      };
      uploadRepository = new UploadRepository({}, {}, {}, shelteringWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      expect(await uploadRepository.bundleExpirationDateInMs(bundleId)).to.equal(123000);
      expect(shelteringWrapperMock.shelteringExpirationDate).to.be.calledOnceWith(bundleId);
    });
  });

  describe('bundleItemsCountLimit', () => {
    const sizeLimit = 42;

    beforeEach(() => {
      configWrapperMock = {
        bundleSizeLimit: sinon.stub().resolves(sizeLimit)
      };
      uploadRepository = new UploadRepository({}, {}, {}, {}, {}, configWrapperMock);
    });

    it('calls wrappers methods with correct arguments', async () => {
      expect(await uploadRepository.bundleItemsCountLimit()).to.equal(sizeLimit);
      expect(configWrapperMock.bundleSizeLimit).to.be.calledOnceWith();
    });
  });

  describe('Verifying a bundle', () => {
    const downloadedBundle = createBundle({}, ['first', 'second', 'third']);
    let uploadRepository;

    beforeEach(() => {
      configWrapperMock = {
        bundleSizeLimit: sinon.stub()
      };

      uploadRepository = new UploadRepository({}, {}, {}, {}, {}, configWrapperMock);
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

  describe('Composing bundle metadata', () => {
    const bundleId = '0x978f69298ba7940c11b16c4a778c7ad1a4e8c6ed3c90c35f36cfec1b20fc53d2';
    const exampleStoragePeriods = 12;
    const exampleUploadData = {
      blockNumber: 120,
      transactionHash: '0xbfa90258fe2badae4cce5316161cdc1f6eccb5d47f0904adafca120e142c9c3e',
      timestamp: 1544171039
    };
    const bundleMetadata = {
      bundleId,
      bundleUploadTimestamp: exampleUploadData.timestamp,
      bundleProofBlock: exampleUploadData.blockNumber,
      bundleTransactionHash: exampleUploadData.transactionHash,
      storagePeriods: exampleStoragePeriods
    };

    beforeEach(() => {
      uploadsActionsMock = {
        getBundleUploadData: sinon.stub().resolves(null)
      };
      uploadsActionsMock.getBundleUploadData.withArgs(bundleId).resolves(exampleUploadData);
      shelteringWrapperMock = {
        bundleStoragePeriods: sinon.stub().resolves(exampleStoragePeriods)
      };
      uploadRepository = new UploadRepository({}, {}, uploadsActionsMock, shelteringWrapperMock);
    });

    it('substitutes metadata fields with data loaded from blockchain', async () => {
      expect(await uploadRepository.composeBundleMetadataFromBlockchain(bundleId)).to.deep.equal(bundleMetadata);
    });

    it('throws ValidationError when bundle with given ID does not exist on chain', async () => {
      await expect(uploadRepository.composeBundleMetadataFromBlockchain('unknownId')).to.be.rejectedWith(ValidationError, 'Bundle with id=unknownId has not been uploaded');
    });
  });
});
