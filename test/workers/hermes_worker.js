/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import HermesWorker from '../../src/workers/hermes_worker';
import HermesUploadStrategy from '../../src/workers/hermes_strategies/regular_interval_upload_strategy';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);
const {expect} = chai;

describe('Hermes Worker', () => {
  const bundleSizeLimit = 10;
  const storagePeriods = 1;
  const retryPeriod = 7;
  let mockDataModelEngine;
  let mockUploadRepository;
  let mockLogger;
  let mockStrategy;
  let mockResult;
  let hermesWorker;
  let workerIntervalStub;
  let storagePeriodsStub;
  let shouldBundleStub;
  let bundlingSucceededStub;

  beforeEach(async () => {
    mockDataModelEngine = {
      initialiseBundling: sinon.stub(),
      cancelBundling: sinon.stub(),
      finaliseBundling: sinon.stub(),
      uploadNotRegisteredBundles: sinon.stub().resolves([])
    };
    mockUploadRepository = {
      bundleSizeLimit: sinon.stub()
    };
    mockLogger = {
      info: sinon.stub()
    };
    mockResult = {
      bundleId: '0xc0ffee'
    };
    mockStrategy = new HermesUploadStrategy();
    workerIntervalStub = sinon.stub(mockStrategy, 'workerInterval');
    storagePeriodsStub = sinon.stub(mockStrategy, 'storagePeriods');
    shouldBundleStub = sinon.stub(mockStrategy, 'shouldBundle');
    bundlingSucceededStub = sinon.stub(mockStrategy, 'bundlingSucceeded');

    hermesWorker = new HermesWorker(mockDataModelEngine, mockUploadRepository, mockStrategy, retryPeriod, mockLogger);
    mockDataModelEngine.initialiseBundling.resolves(mockResult);
    mockUploadRepository.bundleSizeLimit.resolves(bundleSizeLimit);
    await hermesWorker.beforeWorkLoop();
  });

  afterEach(async () => {
    await hermesWorker.afterWorkLoop();
    workerIntervalStub.restore();
    storagePeriodsStub.restore();
    shouldBundleStub.restore();
    bundlingSucceededStub.restore();
  });

  it('asks config contract for bundle size limit', async () => {
    await hermesWorker.periodicWork();
    expect(mockUploadRepository.bundleSizeLimit).to.have.been.calledOnce;
  });

  it('asks data model engine for bundle candidate', async () => {
    const {bundleSequenceNumber} = hermesWorker;
    await hermesWorker.periodicWork();
    expect(mockDataModelEngine.initialiseBundling).to.have.been.calledWith(bundleSequenceNumber, bundleSizeLimit);
  });

  it('asks strategy if the bundle should be uploaded', async () => {
    await hermesWorker.periodicWork();
    expect(shouldBundleStub).to.have.been.calledOnceWith(mockResult);
  });

  it('uploads not register bundles every `retryPeriod` iterations', async () => {
    await hermesWorker.periodicWork();
    expect(mockDataModelEngine.uploadNotRegisteredBundles).to.be.calledOnce;
    for (let ind = 0; ind < retryPeriod - 1; ind++) {
      await hermesWorker.periodicWork();
    }
    expect(mockDataModelEngine.uploadNotRegisteredBundles).to.be.calledOnce;
    await hermesWorker.periodicWork();
    expect(mockDataModelEngine.uploadNotRegisteredBundles).to.be.calledTwice;
  });

  describe('Bundle aborted', async () => {
    beforeEach(async () => {
      shouldBundleStub.resolves(false);
      await hermesWorker.periodicWork();
    });

    it('cancels bundling', async () => {
      expect(mockDataModelEngine.cancelBundling).to.have.been.calledOnceWith(hermesWorker.bundleSequenceNumber);
    });
  });

  describe('Bundle completed', async () => {
    let bundleSequenceNumber;

    beforeEach(async () => {
      shouldBundleStub.resolves(true);
      mockDataModelEngine.finaliseBundling.resolves(mockResult);
      storagePeriodsStub.returns(storagePeriods);
      ({bundleSequenceNumber} = hermesWorker);
      await hermesWorker.periodicWork();
    });

    it('asks strategy for storage periods', async () => {
      expect(storagePeriodsStub).to.have.been.calledOnce;
    });

    it('finalises bundling', async () => {
      expect(mockDataModelEngine.finaliseBundling).to.have.been.calledOnceWith(mockResult, bundleSequenceNumber, storagePeriods);
    });

    it('increments bundleSequenceNumber', async () => {
      const bundleSequenceNumberAfter = hermesWorker.bundleSequenceNumber;
      expect(bundleSequenceNumberAfter - bundleSequenceNumber).to.equal(1);
    });

    it('informs strategy', async () => {
      expect(bundlingSucceededStub).to.have.been.calledOnce;
    });
  });
});
