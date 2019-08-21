/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import AtlasWorker from '../../../src/workers/atlas_worker';
import AtlasParticipationStrategy from '../../../src/workers/atlas_strategies/atlas_participation_strategy';
import AtlasTransferResolver from '../../../src/workers/atlas_resolvers/atlas_transfer_resolver';
import {connectToMongo} from '../../../src/utils/db_utils';
import config from '../../../src/config/config';
import Web3 from 'web3';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Atlas Transfer Resolver', () => {
  const defaultAccount = '0x123';
  const enoughFunds = '10000000000000000000';
  const expirationTime = 155345234132;
  const fetchedBundleMetadata = {bundleId: 'fetchedBundle'};
  const exampleWorkId = 'workid';
  const retryTimeout = 14;
  const {utils} = new Web3();
  let transferResolver;
  let atlasWorker;
  let transfersRepositoryMock;
  let workerTaskTrackingRepositoryMock;
  let failedTransfersMock;
  let dataModelEngineMock;
  let mockWeb3;
  let transferStrategyMock;
  let loggerMock;
  let workerLoggerMock;
  let operationalModeMock;
  let releaseBundlesServiceMock;
  let shouldFetchBundleStub;
  let shouldresolveStub;
  let port;

  beforeEach(async () => {
    mockWeb3 = {
      eth: {
        defaultAccount,
        getBalance: sinon.stub().resolves(enoughFunds),
        getNodeInfo: () => Promise.resolve()
      },
      utils
    };
    const {client: mongoClient} = await connectToMongo(config);
    transfersRepositoryMock = {
      ongoingResolutions: sinon.stub(),
      resolve: sinon.stub(),
      getExpirationTimeInMs: sinon.stub().resolves(expirationTime)
    };
    failedTransfersMock = {
      rememberFailedResolution: sinon.spy(),
      didResolutionFailRecently: sinon.stub().returns(false),
      clearOutdatedResolutions: sinon.spy(),
      failedResolutionsEndTime: {}
    };
    workerTaskTrackingRepositoryMock = {
      tryToBeginWork: sinon.stub().resolves(exampleWorkId),
      finishWork: sinon.spy()
    };
    dataModelEngineMock = {
      downloadBundle: sinon.stub().resolves(fetchedBundleMetadata),
      cleanupBundles: sinon.spy(),
      markBundleAsSheltered: sinon.stub()
    };
    transferStrategyMock = new AtlasParticipationStrategy();
    sinon.stub(transferStrategyMock, 'retryTimeout').get(() => retryTimeout);
    shouldFetchBundleStub = sinon.stub(transferStrategyMock, 'shouldFetchBundle').resolves(true);
    shouldresolveStub = sinon.stub(transferStrategyMock, 'shouldResolve').resolves(true);
    sinon.stub(transferStrategyMock, 'afterResolution');
    loggerMock = {
      info: sinon.spy(),
      error: sinon.spy()
    };
    workerLoggerMock = {
      logger: loggerMock,
      addLog: sinon.stub()
    };
    operationalModeMock = {
      isRetire: sinon.stub().returns(false)
    };
    releaseBundlesServiceMock = {
      reset: sinon.stub()
    };

    transferResolver = new AtlasTransferResolver(
      mockWeb3,
      dataModelEngineMock,
      transfersRepositoryMock,
      failedTransfersMock,
      transferStrategyMock,
      workerLoggerMock
    );

    const resolvers = [
      transferResolver
    ];

    atlasWorker = new AtlasWorker(
      mockWeb3,
      dataModelEngineMock,
      workerLoggerMock,
      workerTaskTrackingRepositoryMock,
      mongoClient,
      resolvers,
      operationalModeMock,
      config,
      releaseBundlesServiceMock
    );

    atlasWorker.beforeWorkLoop();
    ({port} = atlasWorker.server.address());
  });

  afterEach(async () => {
    await atlasWorker.afterWorkLoop();
  });

  describe('Transfer resolution', () => {
    const donorId = 'donor';
    const bundleId = 'bundle';
    const transferId = 'transfer';
    const transfer1 = {donorId, bundleId, transferId, bundleNumber: 1};
    const transfer2 = {donorId: 2, bundleId: 12, transferId: 6, bundleNumber: 2};
    const transfer3 = {donorId: 5, bundleId: 6, transferId: 2, bundleNumber: 3};
    const transfers = [
      transfer1,
      transfer2,
      transfer3
    ];

    it('tryToDownload downloads the bundle', async () => {
      expect(await transferResolver.tryToDownload(transfer1)).to.equal(fetchedBundleMetadata);
      expect(transfersRepositoryMock.getExpirationTimeInMs).to.be.calledOnceWith(transfer1);
      expect(dataModelEngineMock.downloadBundle).to.be.calledWith(bundleId, donorId, expirationTime);
    });

    it('tryToResolve resolves a transfer and sets expiration date', async () => {
      await transferResolver.tryToResolve(fetchedBundleMetadata.bundleId, transfer1);
      expect(transfersRepositoryMock.resolve).to.be.calledWith(transfer1);
      expect(dataModelEngineMock.markBundleAsSheltered).to.be.calledWith(fetchedBundleMetadata.bundleId);
    });

    describe('tryWithTransfer', () => {
      let tryToDownloadMock;
      let tryToResolveMock;
      let isTurnToResolveMock;
      const bundleMetadata = 'bundleMetadata';

      beforeEach(() => {
        tryToDownloadMock = sinon.stub(transferResolver, 'tryToDownload');
        tryToResolveMock = sinon.stub(transferResolver, 'tryToResolve');
        isTurnToResolveMock = sinon.stub(transferResolver, 'isTurnToResolve');

        shouldFetchBundleStub.resolves(true);
        tryToDownloadMock.resolves(bundleMetadata);
        shouldresolveStub.returns(true);
        isTurnToResolveMock.returns(true);
        tryToResolveMock.resolves();
      });

      afterEach(() => {
        tryToDownloadMock.restore();
        tryToResolveMock.restore();
        isTurnToResolveMock.restore();
      });

      it('returns false if the transfer was previously marked as failing', async () => {
        failedTransfersMock.didResolutionFailRecently.returns(true);
        expect(await transferResolver.tryWith(transfer1)).to.equal(false);
        expect(failedTransfersMock.didResolutionFailRecently).to.be.calledOnceWith(transfer1.transferId);
        expect(tryToDownloadMock).to.not.have.been.called;
      });

      it('returns false if the strategy disqualifies the transfer', async () => {
        shouldFetchBundleStub.resolves(false);
        expect(await transferResolver.tryWith(transfer1)).to.equal(false);
        expect(tryToDownloadMock).to.not.have.been.called;
        expect(failedTransfersMock.rememberFailedResolution).to.not.have.been.called;
      });

      it('returns false and marks transfer as failed if an attempt to download the bundle fails', async () => {
        tryToDownloadMock.rejects();
        expect(await transferResolver.tryWith(transfer1)).to.equal(false);
        expect(tryToDownloadMock).to.have.been.calledWith(transfer1);
        expect(failedTransfersMock.rememberFailedResolution).to.be.calledOnceWith(transfer1.transferId, retryTimeout);
      });

      it('returns false if the strategy disqualifies the transfer after downloaded the bundle', async () => {
        shouldresolveStub.returns(false);
        expect(await transferResolver.tryWith(transfer1)).to.equal(false);
        expect(shouldresolveStub).to.have.been.calledWith('bundleMetadata');
        expect(tryToResolveMock).to.not.have.been.called;
        expect(failedTransfersMock.rememberFailedResolution).to.not.have.been.called;
      });

      it('returns false if it is not the turn of the node to resolve the transfer', async () => {
        isTurnToResolveMock.returns(false);
        expect(await transferResolver.tryWith(transfer1)).to.equal(false);
        expect(tryToResolveMock).to.not.have.been.called;
        expect(failedTransfersMock.rememberFailedResolution).to.not.have.been.called;
      });

      it('returns false and marks transfer as failed if the resolution attempt fails', async () => {
        tryToResolveMock.rejects();
        expect(await transferResolver.tryWith(transfer1)).to.equal(false);
        expect(tryToResolveMock).to.have.been.calledWith(bundleMetadata.bundleId, transfer1);
        expect(failedTransfersMock.rememberFailedResolution).to.be.calledOnceWith(transfer1.transferId, retryTimeout);
      });

      it('returns true if everything goes ok', async () => {
        expect(await transferResolver.tryWith(transfer1)).to.equal(true);
        expect(transferStrategyMock.afterResolution).to.have.been.calledWith(transfer1);
      });

      it('does not download bundle if not turn to resolve', async () => {
        isTurnToResolveMock.returns(false);
        await transferResolver.tryWith(transfer1);
        expect(tryToDownloadMock).to.not.have.been.called;
      });
    });

    describe('periodicWork', () => {
      let tryWithMock;

      beforeEach(() => {
        transfersRepositoryMock.ongoingResolutions.resolves(transfers);
        tryWithMock = sinon.stub(transferResolver, 'tryWith');
      });

      afterEach(() => {
        tryWithMock.restore();
      });

      it('gets ongoing transfers', async () => {
        await atlasWorker.periodicWork();
        expect(transfersRepositoryMock.ongoingResolutions).to.be.calledOnce;
      });

      it('tries to resolve transfers in order until it succeeds', async () => {
        tryWithMock.withArgs(transfer1).resolves(false);
        tryWithMock.withArgs(transfer2).resolves(true);
        atlasWorker.resolveByOne = true;
        await atlasWorker.periodicWork();
        atlasWorker.resolveByOne = config.atlasProcessActiveResolviesByOne;
        expect(tryWithMock).to.have.been.calledWith(transfer1);
        expect(tryWithMock).to.have.been.calledWith(transfer2);
        expect(tryWithMock).to.not.have.been.calledWith(transfer3);
      });

      it('clears outdated failed transfers', async () => {
        await atlasWorker.periodicWork();
        expect(failedTransfersMock.clearOutdatedResolutions).to.be.calledOnce;
      });

      it('starts and ends AtlasTransferResolution task', async () => {
        await atlasWorker.periodicWork();
        expect(workerTaskTrackingRepositoryMock.tryToBeginWork).to.be.calledBefore(transfersRepositoryMock.ongoingResolutions);
        expect(workerTaskTrackingRepositoryMock.tryToBeginWork).to.be.calledOnceWith('AtlasResolutions');
        expect(workerTaskTrackingRepositoryMock.finishWork).to.be.calledAfter(failedTransfersMock.clearOutdatedResolutions);
        expect(workerTaskTrackingRepositoryMock.finishWork).to.be.calledOnceWith(exampleWorkId);
      });

      it('should end task even if an error was thrown', async () => {
        transfersRepositoryMock.ongoingResolutions.rejects();
        await expect(atlasWorker.periodicWork()).to.be.rejected;
        expect(workerTaskTrackingRepositoryMock.finishWork).to.be.calledOnceWith(exampleWorkId);
      });
    });
  });

  describe('prometheus metrics', () => {
    let isTurnToResolveMock;
    beforeEach(async () => {
      isTurnToResolveMock = sinon.stub(transferResolver, 'isTurnToResolve');
      isTurnToResolveMock.resolves();
      isTurnToResolveMock.returns(true);
      transfersRepositoryMock.ongoingResolutions.resolves([
        {donorId: 5, bundleId: 6, transferId: 2, bundleNumber: 3}
      ]);
      const metrics = await readMetrics(port);
      expect(metrics).to.not.include('atlas_transfers_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="failed"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="should_not_fetch"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="should_not_resolve"}');
    });

    it('records metrics on resolved transfers', async () => {
      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_transfers_total{status="resolved"} 1');
      expect(metrics).to.not.include('atlas_transfers_total{status="failed"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="should_not_fetch"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="should_not_resolve"}');
    });

    it('records metrics on failed transfers', async () => {
      sinon.stub(transferResolver, 'tryToResolve');
      transferResolver.tryToResolve.rejects();

      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_transfers_total{status="failed"} 1');
      expect(metrics).to.not.include('atlas_transfers_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="should_not_fetch"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="should_not_resolve"}');
    });

    it('records metrics on transfers that should not be fetched', async () => {
      transferResolver.strategy.shouldFetchBundle.returns(false);

      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_transfers_total{status="should_not_fetch"} 1');
      expect(metrics).to.not.include('atlas_transfers_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="failed"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="should_not_resolve"}');
    });

    it('records metrics on transfers that should not be resolved', async () => {
      transferResolver.strategy.shouldResolve.returns(false);

      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_transfers_total{status="should_not_resolve"} 1');
      expect(metrics).to.not.include('atlas_transfers_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="failed"}');
      expect(metrics).to.not.include('atlas_transfers_total{status="should_not_fetch"}');
    });
  });
});

const readMetrics = async (port) => {
  const {text} = await chai.request(`http://localhost:${port}`).get('/metrics');
  return text;
};
