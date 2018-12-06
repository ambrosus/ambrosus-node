/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromissed from 'chai-as-promised';
import chaiHttp from 'chai-http';
import HermesWorker from '../../src/workers/hermes_worker';
import HermesUploadStrategy from '../../src/workers/hermes_strategies/upload_strategy';
import {connectToMongo} from '../../src/utils/db_utils';
import config from '../../config/config';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromissed);
const {expect} = chai;

describe('Hermes Worker', () => {
  const storagePeriods = 1;
  const exampleWorkId = 'workid';
  let mockDataModelEngine;
  let mockWorkerLogRepository;
  let mockWorkerTaskTrackingRepository;
  let mockLogger;
  let mockStrategy;
  let mockResult;
  let hermesWorker;
  let bundleSequenceNumber;

  beforeEach(async () => {
    mockResult = {
      bundleId: '0xc0ffee'
    };
    mockDataModelEngine = {
      identityManager: {
        web3: {
          eth: {getNodeInfo: () => Promise.resolve()}
        }
      },
      rejectAllBundleCandidate: sinon.stub().resolves(),
      prepareBundleCandidate: sinon.stub().resolves(mockResult),
      rejectBundleCandidate: sinon.stub().resolves(),
      acceptBundleCandidate: sinon.stub().resolves(mockResult),
      uploadAcceptedBundleCandidates: sinon.stub().resolves({
        ok: [],
        failed: {}
      })
    };
    mockWorkerTaskTrackingRepository = {
      tryToBeginWork: sinon.stub().resolves(exampleWorkId),
      finishWork: sinon.spy()
    };
    mockWorkerLogRepository = {
      storeLog: sinon.stub()
    };
    mockLogger = {
      info: sinon.stub(),
      error: sinon.stub()
    };
    mockStrategy = sinon.createStubInstance(HermesUploadStrategy);

    const {client: mongoClient} = await connectToMongo(config); hermesWorker = new HermesWorker(
      mockDataModelEngine,
      mockWorkerLogRepository,
      mockWorkerTaskTrackingRepository,
      mockStrategy,
      mockLogger,
      mongoClient,
      config.serverPort
    );
    await hermesWorker.beforeWorkLoop();

    ({bundleSequenceNumber} = hermesWorker);
  });

  afterEach(async () => {
    await hermesWorker.afterWorkLoop();
  });

  describe('Bundle candidate creation', () => {
    it('asks strategy for storage periods', async () => {
      await hermesWorker.periodicWork();
      expect(mockStrategy.storagePeriods).to.have.been.calledOnce;
    });

    it('asks data model engine for a bundle candidate', async () => {
      await hermesWorker.periodicWork();
      expect(mockDataModelEngine.prepareBundleCandidate).to.have.been.calledWith(bundleSequenceNumber);
    });

    it('increases the bundle sequence number', async () => {
      await hermesWorker.periodicWork();
      expect(hermesWorker.bundleSequenceNumber).to.equal(bundleSequenceNumber + 1);
    });

    it('asks strategy if the bundle candidate is valid', async () => {
      await hermesWorker.periodicWork();
      expect(mockStrategy.shouldBundle).to.have.been.calledOnceWith(mockResult);
    });

    describe('if valid', () => {
      beforeEach(() => {
        mockStrategy.shouldBundle.resolves(true);
        mockStrategy.storagePeriods.returns(storagePeriods);
      });

      it('stores the bundle candidate', async () => {
        await hermesWorker.periodicWork();
        expect(mockDataModelEngine.acceptBundleCandidate).to.have.been.calledOnceWith(mockResult, bundleSequenceNumber, storagePeriods);
      });

      it('calls the bundlingSucceeded method on the strategy', async () => {
        await hermesWorker.periodicWork();
        expect(mockStrategy.bundlingSucceeded).to.have.been.calledOnce;
      });
    });

    describe('if invalid', () => {
      beforeEach(() => {
        mockStrategy.shouldBundle.resolves(false);
      });

      it('discards the bundle candidate', async () => {
        await hermesWorker.periodicWork();
        expect(mockDataModelEngine.rejectBundleCandidate).to.have.been.calledOnceWith(bundleSequenceNumber);
      });
    });
  });

  describe('Bundle candidate upload', () => {
    it('is requested', async () => {
      await hermesWorker.periodicWork();
      expect(mockDataModelEngine.uploadAcceptedBundleCandidates).to.have.been.calledOnce;
    });
  });

  describe('Task tracking', () => {
    it('bundling process starts and ends HermesBundling task', async () => {
      await hermesWorker.periodicWork();
      expect(mockWorkerTaskTrackingRepository.tryToBeginWork).to.be.calledBefore(mockDataModelEngine.prepareBundleCandidate);
      expect(mockWorkerTaskTrackingRepository.tryToBeginWork).to.be.calledOnceWith('HermesBundling');
      expect(mockWorkerTaskTrackingRepository.finishWork).to.be.calledAfter(mockDataModelEngine.uploadAcceptedBundleCandidates);
      expect(mockWorkerTaskTrackingRepository.finishWork).to.be.calledOnceWith(exampleWorkId);
    });

    it('should end task in every work loop even if error was thrown', async () => {
      mockDataModelEngine.prepareBundleCandidate.rejects();
      await expect(hermesWorker.periodicWork()).to.be.rejected;
      expect(mockWorkerTaskTrackingRepository.finishWork).to.be.calledOnceWith(exampleWorkId);
    });
  });

  it('health checks', async () => {
    const {port} = hermesWorker.server.address();
    const {status} = await chai.request(`http://localhost:${port}`).get('/health');
    expect(status).to.eql(200);
  });
});
