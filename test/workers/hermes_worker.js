/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import chaiHttp from 'chai-http';
import HermesWorker from '../../src/workers/hermes_worker';
import HermesUploadStrategy from '../../src/workers/hermes_strategies/upload_strategy';
import {connectToMongo} from '../../src/utils/db_utils';
import config from '../../src/config/config';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Hermes Worker', () => {
  const storagePeriods = 1;
  const exampleWorkId = 'workid';
  const bundleId = '0xc0ffee';
  let mockDataModelEngine;
  let mockWorkerTaskTrackingRepository;
  let mockLogger;
  let mockWorkerLogger;
  let mockStrategy;
  let mockResult;
  let hermesWorker;
  let bundleSequenceNumber;
  let serverAddress;

  beforeEach(async () => {
    mockResult = {
      bundleId
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
      uploadAcceptedBundleCandidates: sinon.stub().callsFake(async (controls) => {
        await controls.success(bundleId, 'Bundle has been uploaded');
      })
    };
    mockWorkerTaskTrackingRepository = {
      tryToBeginWork: sinon.stub().resolves(exampleWorkId),
      finishWork: sinon.spy()
    };
    mockLogger = {
      info: sinon.stub(),
      error: sinon.stub()
    };
    mockWorkerLogger = {
      logger: mockLogger,
      addLog: sinon.stub()
    };
    mockStrategy = sinon.createStubInstance(HermesUploadStrategy);
    mockStrategy.shouldBundle.resolves({result: true});
    mockStrategy.storagePeriods.returns(storagePeriods);

    const {client: mongoClient} = await connectToMongo(config);
    hermesWorker = new HermesWorker(
      mockDataModelEngine,
      mockWorkerLogger,
      mockWorkerTaskTrackingRepository,
      mockStrategy,
      mongoClient,
      config.serverPort
    );
    await hermesWorker.beforeWorkLoop();
    const {port} = hermesWorker.server.address();
    serverAddress = `http://localhost:${port}`;
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
      it('discards the bundle candidate', async () => {
        mockStrategy.shouldBundle.resolves({result: false, reason: 'Rejection reason'});

        await hermesWorker.periodicWork();
        expect(mockDataModelEngine.rejectBundleCandidate).to.have.been.calledOnceWith(bundleSequenceNumber);
      });
    });
  });

  describe('Bundle candidate upload', () => {
    it('is requested and summary is logged', async () => {
      await hermesWorker.periodicWork();
      expect(mockDataModelEngine.uploadAcceptedBundleCandidates).to.have.been.calledOnce;
      expect(mockWorkerLogger.addLog).to.have.been.calledWith('Bundle has been uploaded', {bundleId});
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
    const {status} = await chai.request(serverAddress).get('/health');
    expect(status).to.eql(200);
  });

  it('records prometheus metrics on successful uploads', async () => {
    const {text: textBefore} = await chai.request(serverAddress).get('/metrics');
    expect(textBefore).to.include('hermes_bundle_uploads_total 0');

    await hermesWorker.periodicWork();

    const {text: textAfter} = await chai.request(serverAddress).get('/metrics');
    expect(textAfter).to.include('hermes_bundle_uploads_total 1');
  });

  it('records prometheus metrics on failed uploads', async () => {
    mockDataModelEngine.uploadAcceptedBundleCandidates = sinon.stub().callsFake(async (callbacks) => {
      await callbacks.fail(bundleId, new Error());
    });

    const {text: textBefore} = await chai.request(serverAddress).get('/metrics');
    expect(textBefore).to.include('hermes_bundle_upload_failures_total 0');

    await hermesWorker.periodicWork();

    const {text: textAfter} = await chai.request(serverAddress).get('/metrics');
    expect(textAfter).to.include('hermes_bundle_upload_failures_total 1');
  });
});
