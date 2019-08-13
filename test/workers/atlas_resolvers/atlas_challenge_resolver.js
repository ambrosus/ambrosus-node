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
import AtlasChallengeResolver from '../../../src/workers/atlas_resolvers/atlas_challenge_resolver';
import {connectToMongo} from '../../../src/utils/db_utils';
import config from '../../../src/config/config';
import Web3 from 'web3';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Atlas Challenge Resolver', () => {
  const defaultAccount = '0x123';
  const enoughFunds = '10000000000000000000';
  const expirationTime = 155345234132;
  const fetchedBundleMetadata = {bundleId: 'fetchedBundle'};
  const exampleWorkId = 'workid';
  const retryTimeout = 14;
  const {utils} = new Web3();
  let challengeResolver;
  let atlasWorker;
  let challengesRepositoryMock;
  let workerTaskTrackingRepositoryMock;
  let failedChallengesMock;
  let dataModelEngineMock;
  let mockWeb3;
  let challengeStrategyMock;
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
    challengesRepositoryMock = {
      ongoingResolutions: sinon.stub(),
      resolve: sinon.stub(),
      getExpirationTimeInMs: sinon.stub().resolves(expirationTime)
    };
    failedChallengesMock = {
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
    challengeStrategyMock = new AtlasParticipationStrategy();
    sinon.stub(challengeStrategyMock, 'retryTimeout').get(() => retryTimeout);
    shouldFetchBundleStub = sinon.stub(challengeStrategyMock, 'shouldFetchBundle').resolves(true);
    shouldresolveStub = sinon.stub(challengeStrategyMock, 'shouldResolve').resolves(true);
    sinon.stub(challengeStrategyMock, 'afterResolution');
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

    challengeResolver = new AtlasChallengeResolver(
      mockWeb3,
      dataModelEngineMock,
      challengesRepositoryMock,
      failedChallengesMock,
      challengeStrategyMock,
      workerLoggerMock
    );

    const resolvers = [
      challengeResolver
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

  describe('Challenge resolution', () => {
    const sheltererId = 'shelterer';
    const bundleId = 'bundle';
    const challengeId = 'challenge';
    const challenge1 = {sheltererId, bundleId, challengeId, bundleNumber: 1};
    const challenge2 = {sheltererId: 2, bundleId: 12, challengeId: 6, bundleNumber: 2};
    const challenge3 = {sheltererId: 5, bundleId: 6, challengeId: 2, bundleNumber: 3};
    const challenges = [
      challenge1,
      challenge2,
      challenge3
    ];

    it('tryToDownload downloads the bundle', async () => {
      expect(await challengeResolver.tryToDownload(challenge1)).to.equal(fetchedBundleMetadata);
      expect(challengesRepositoryMock.getExpirationTimeInMs).to.be.calledOnceWith(challenge1);
      expect(dataModelEngineMock.downloadBundle).to.be.calledWith(bundleId, sheltererId, expirationTime);
    });

    it('tryToResolve resolves a challenge and sets expiration date', async () => {
      await challengeResolver.tryToResolve(fetchedBundleMetadata.bundleId, challenge1);
      expect(challengesRepositoryMock.resolve).to.be.calledWith(challenge1);
      expect(dataModelEngineMock.markBundleAsSheltered).to.be.calledWith(fetchedBundleMetadata.bundleId);
    });

    describe('tryWithChallenge', () => {
      let tryToDownloadMock;
      let tryToResolveMock;
      let isTurnToResolveMock;
      const bundleMetadata = 'bundleMetadata';

      beforeEach(() => {
        tryToDownloadMock = sinon.stub(challengeResolver, 'tryToDownload');
        tryToResolveMock = sinon.stub(challengeResolver, 'tryToResolve');
        isTurnToResolveMock = sinon.stub(challengeResolver, 'isTurnToResolve');

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

      it('returns false if the challenge was previously marked as failing', async () => {
        failedChallengesMock.didResolutionFailRecently.returns(true);
        expect(await challengeResolver.tryWith(challenge1)).to.equal(false);
        expect(failedChallengesMock.didResolutionFailRecently).to.be.calledOnceWith(challenge1.challengeId);
        expect(tryToDownloadMock).to.not.have.been.called;
      });

      it('returns false if the strategy disqualifies the challenge', async () => {
        shouldFetchBundleStub.resolves(false);
        expect(await challengeResolver.tryWith(challenge1)).to.equal(false);
        expect(tryToDownloadMock).to.not.have.been.called;
        expect(failedChallengesMock.rememberFailedResolution).to.not.have.been.called;
      });

      it('returns false and marks challenge as failed if an attempt to download the bundle fails', async () => {
        tryToDownloadMock.rejects();
        expect(await challengeResolver.tryWith(challenge1)).to.equal(false);
        expect(tryToDownloadMock).to.have.been.calledWith(challenge1);
        expect(failedChallengesMock.rememberFailedResolution).to.be.calledOnceWith(challenge1.challengeId, retryTimeout);
      });

      it('returns false if the strategy disqualifies the challenge after downloaded the bundle', async () => {
        shouldresolveStub.returns(false);
        expect(await challengeResolver.tryWith(challenge1)).to.equal(false);
        expect(shouldresolveStub).to.have.been.calledWith('bundleMetadata');
        expect(tryToResolveMock).to.not.have.been.called;
        expect(failedChallengesMock.rememberFailedResolution).to.not.have.been.called;
      });

      it('returns false if it is not the turn of the node to resolve the challenge', async () => {
        isTurnToResolveMock.returns(false);
        expect(await challengeResolver.tryWith(challenge1)).to.equal(false);
        expect(tryToResolveMock).to.not.have.been.called;
        expect(failedChallengesMock.rememberFailedResolution).to.not.have.been.called;
      });

      it('returns false and marks challenge as failed if the resolution attempt fails', async () => {
        tryToResolveMock.rejects();
        expect(await challengeResolver.tryWith(challenge1)).to.equal(false);
        expect(tryToResolveMock).to.have.been.calledWith(bundleMetadata.bundleId, challenge1);
        expect(failedChallengesMock.rememberFailedResolution).to.be.calledOnceWith(challenge1.challengeId, retryTimeout);
      });

      it('returns true if everything goes ok', async () => {
        expect(await challengeResolver.tryWith(challenge1)).to.equal(true);
        expect(challengeStrategyMock.afterResolution).to.have.been.calledWith(challenge1);
      });

      it('does not download bundle if not turn to resolve', async () => {
        isTurnToResolveMock.returns(false);
        await challengeResolver.tryWith(challenge1);
        expect(tryToDownloadMock).to.not.have.been.called;
      });
    });

    describe('periodicWork', () => {
      let tryWithMock;

      beforeEach(() => {
        challengesRepositoryMock.ongoingResolutions.resolves(challenges);
        tryWithMock = sinon.stub(challengeResolver, 'tryWith');
      });

      afterEach(() => {
        tryWithMock.restore();
      });

      it('gets ongoing challenges', async () => {
        await atlasWorker.periodicWork();
        expect(challengesRepositoryMock.ongoingResolutions).to.be.calledOnce;
      });

      it('tries to resolve challenges in order until it succeeds', async () => {
        tryWithMock.withArgs(challenge1).resolves(false);
        tryWithMock.withArgs(challenge2).resolves(true);
        atlasWorker.resolveByOne = true;
        await atlasWorker.periodicWork();
        atlasWorker.resolveByOne = config.atlasProcessActiveResolviesByOne;
        expect(tryWithMock).to.have.been.calledWith(challenge1);
        expect(tryWithMock).to.have.been.calledWith(challenge2);
        expect(tryWithMock).to.not.have.been.calledWith(challenge3);
      });

      it('clears outdated failed challenges', async () => {
        await atlasWorker.periodicWork();
        expect(failedChallengesMock.clearOutdatedResolutions).to.be.calledOnce;
      });

      it('starts and ends AtlasChallengeResolution task', async () => {
        await atlasWorker.periodicWork();
        expect(workerTaskTrackingRepositoryMock.tryToBeginWork).to.be.calledBefore(challengesRepositoryMock.ongoingResolutions);
        expect(workerTaskTrackingRepositoryMock.tryToBeginWork).to.be.calledOnceWith('AtlasResolutions');
        expect(workerTaskTrackingRepositoryMock.finishWork).to.be.calledAfter(failedChallengesMock.clearOutdatedResolutions);
        expect(workerTaskTrackingRepositoryMock.finishWork).to.be.calledOnceWith(exampleWorkId);
      });

      it('should end task even if an error was thrown', async () => {
        challengesRepositoryMock.ongoingResolutions.rejects();
        await expect(atlasWorker.periodicWork()).to.be.rejected;
        expect(workerTaskTrackingRepositoryMock.finishWork).to.be.calledOnceWith(exampleWorkId);
      });
    });
  });

  describe('prometheus metrics', () => {
    let isTurnToResolveMock;
    beforeEach(async () => {
      isTurnToResolveMock = sinon.stub(challengeResolver, 'isTurnToResolve');
      isTurnToResolveMock.resolves();
      isTurnToResolveMock.returns(true);
      challengesRepositoryMock.ongoingResolutions.resolves([
        {sheltererId: 5, bundleId: 6, challengeId: 2, bundleNumber: 3}
      ]);
      const metrics = await readMetrics(port);
      expect(metrics).to.not.include('atlas_challenges_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="failed"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_fetch"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_resolve"}');
    });

    it('records metrics on resolved challenges', async () => {
      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_challenges_total{status="resolved"} 1');
      expect(metrics).to.not.include('atlas_challenges_total{status="failed"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_fetch"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_resolve"}');
    });

    it('records metrics on failed challenges', async () => {
      sinon.stub(challengeResolver, 'tryToResolve');
      challengeResolver.tryToResolve.rejects();

      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_challenges_total{status="failed"} 1');
      expect(metrics).to.not.include('atlas_challenges_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_fetch"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_resolve"}');
    });

    it('records metrics on challenges that should not be fetched', async () => {
      challengeResolver.strategy.shouldFetchBundle.returns(false);

      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_challenges_total{status="should_not_fetch"} 1');
      expect(metrics).to.not.include('atlas_challenges_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="failed"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_resolve"}');
    });

    it('records metrics on challenges that should not be resolved', async () => {
      challengeResolver.strategy.shouldResolve.returns(false);

      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_challenges_total{status="should_not_resolve"} 1');
      expect(metrics).to.not.include('atlas_challenges_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="failed"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_fetch"}');
    });
  });
});

const readMetrics = async (port) => {
  const {text} = await chai.request(`http://localhost:${port}`).get('/metrics');
  return text;
};
