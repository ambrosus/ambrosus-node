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
import AtlasWorker from '../../src/workers/atlas_worker';
import AtlasParticipationStrategy from '../../src/workers/atlas_strategies/atlas_participation_strategy';
import {connectToMongo} from '../../src/utils/db_utils';
import config from '../../src/config/config';
import Web3 from 'web3';
import getAvailableDiskSpace from '../../src/utils/disk_usage';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Atlas Worker', () => {
  const defaultAccount = '0x123';
  const enoughFunds = '10000000000000000000';
  const expirationTime = 155345234132;
  const fetchedBundleMetadata = {bundleId: 'fetchedBundle'};
  const exampleWorkId = 'workid';
  const workerInterval = 10;
  const retryTimeout = 14;
  const requiredFreeDiskSpace = 1000;
  const {utils} = new Web3();
  let atlasWorker;
  let challengesRepositoryMock;
  let workerTaskTrackingRepositoryMock;
  let failedChallengesMock;
  let dataModelEngineMock;
  let mockWorkerLogRepository;
  let mockWeb3;
  let challengeStrategyMock;
  let transferStrategyMock;
  let loggerMock;
  let shouldFetchBundleStub;
  let shouldResolveStub;
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
      ongoingChallenges: sinon.stub(),
      resolveChallenge: sinon.stub(),
      getChallengeExpirationTimeInMs: sinon.stub().resolves(expirationTime)
    };
    failedChallengesMock = {
      rememberFailedChallenge: sinon.spy(),
      didChallengeFailRecently: sinon.stub().returns(false),
      clearOutdatedChallenges: sinon.spy(),
      failedChallengesEndTime: {}
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
    mockWorkerLogRepository = {
      storeLog: sinon.stub()
    };
    challengeStrategyMock = new AtlasParticipationStrategy();
    sinon.stub(challengeStrategyMock, 'retryTimeout').get(() => retryTimeout);
    shouldFetchBundleStub = sinon.stub(challengeStrategyMock, 'shouldFetchBundle').resolves(true);
    shouldResolveStub = sinon.stub(challengeStrategyMock, 'shouldResolve').resolves(true);
    sinon.stub(challengeStrategyMock, 'afterResolution');
    transferStrategyMock = new AtlasParticipationStrategy();
    sinon.stub(transferStrategyMock, 'retryTimeout').get(() => retryTimeout);
    sinon.stub(transferStrategyMock, 'shouldFetchBundle').resolves(true);
    sinon.stub(transferStrategyMock, 'shouldResolve').resolves(true);
    sinon.stub(transferStrategyMock, 'afterResolution');
    loggerMock = {
      info: sinon.spy(),
      error: sinon.spy()
    };

    atlasWorker = new AtlasWorker(
      mockWeb3,
      dataModelEngineMock,
      mockWorkerLogRepository,
      challengesRepositoryMock,
      workerTaskTrackingRepositoryMock,
      failedChallengesMock,
      challengeStrategyMock,
      transferStrategyMock,
      loggerMock,
      mongoClient,
      config.serverPort,
      requiredFreeDiskSpace,
      workerInterval
    );

    atlasWorker.beforeWorkLoop();
    ({port} = atlasWorker.server.address());
  });

  afterEach(async () => {
    await atlasWorker.afterWorkLoop();
  });

  it('set the work interval into constructor', () => {
    expect(atlasWorker.interval).to.equal(workerInterval);
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
      expect(await atlasWorker.tryToDownload(challenge1)).to.equal(fetchedBundleMetadata);
      expect(challengesRepositoryMock.getChallengeExpirationTimeInMs).to.be.calledOnceWith(challengeId);
      expect(dataModelEngineMock.downloadBundle).to.be.calledWith(bundleId, sheltererId, expirationTime);
    });

    it('tryToResolve resolves a challenge and sets expiration date', async () => {
      await atlasWorker.tryToResolve(fetchedBundleMetadata, challenge1);
      expect(challengesRepositoryMock.resolveChallenge).to.be.calledWith(challengeId);
      expect(dataModelEngineMock.markBundleAsSheltered).to.be.calledWith(fetchedBundleMetadata.bundleId);
    });

    describe('tryWithChallenge', () => {
      let tryToDownloadMock;
      let tryToResolveMock;
      let isTurnToResolveMock;
      const bundleMetadata = 'bundleMetadata';

      beforeEach(() => {
        tryToDownloadMock = sinon.stub(atlasWorker, 'tryToDownload');
        tryToResolveMock = sinon.stub(atlasWorker, 'tryToResolve');
        isTurnToResolveMock = sinon.stub(atlasWorker, 'isTurnToResolve');

        shouldFetchBundleStub.resolves(true);
        tryToDownloadMock.resolves(bundleMetadata);
        shouldResolveStub.returns(true);
        isTurnToResolveMock.returns(true);
        tryToResolveMock.resolves();
      });

      afterEach(() => {
        tryToDownloadMock.restore();
        tryToResolveMock.restore();
        isTurnToResolveMock.restore();
      });

      it('returns false if the challenge was previously marked as failing', async () => {
        failedChallengesMock.didChallengeFailRecently.returns(true);
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(false);
        expect(failedChallengesMock.didChallengeFailRecently).to.be.calledOnceWith(challenge1.challengeId);
        expect(tryToDownloadMock).to.not.have.been.called;
      });

      it('returns false if the strategy disqualifies the challenge', async () => {
        shouldFetchBundleStub.resolves(false);
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(false);
        expect(tryToDownloadMock).to.not.have.been.called;
        expect(failedChallengesMock.rememberFailedChallenge).to.not.have.been.called;
      });

      it('returns false and marks challenge as failed if an attempt to download the bundle fails', async () => {
        tryToDownloadMock.rejects();
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(false);
        expect(tryToDownloadMock).to.have.been.calledWith(challenge1);
        expect(failedChallengesMock.rememberFailedChallenge).to.be.calledOnceWith(challenge1.challengeId, retryTimeout);
      });

      it('returns false if the strategy disqualifies the challenge after downloaded the bundle', async () => {
        shouldResolveStub.returns(false);
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(false);
        expect(shouldResolveStub).to.have.been.calledWith('bundleMetadata');
        expect(tryToResolveMock).to.not.have.been.called;
        expect(failedChallengesMock.rememberFailedChallenge).to.not.have.been.called;
      });

      it('returns false if it is not the turn of the node to resolve the challenge', async () => {
        isTurnToResolveMock.returns(false);
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(false);
        expect(tryToResolveMock).to.not.have.been.called;
        expect(failedChallengesMock.rememberFailedChallenge).to.not.have.been.called;
      });

      it('returns false and marks challenge as failed if the resolution attempt fails', async () => {
        tryToResolveMock.rejects();
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(false);
        expect(tryToResolveMock).to.have.been.calledWith(bundleMetadata, challenge1);
        expect(failedChallengesMock.rememberFailedChallenge).to.be.calledOnceWith(challenge1.challengeId, retryTimeout);
      });

      it('returns true if everything goes ok', async () => {
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(true);
        expect(challengeStrategyMock.afterResolution).to.have.been.calledWith(challenge1);
      });

      it('does not download bundle if not turn to resolve', async () => {
        isTurnToResolveMock.returns(false);
        await atlasWorker.tryWithChallenge(challenge1);
        expect(tryToDownloadMock).to.not.have.been.called;
      });
    });

    describe('periodicWork', () => {
      let tryWithChallengeMock;

      beforeEach(() => {
        challengesRepositoryMock.ongoingChallenges.resolves(challenges);
        tryWithChallengeMock = sinon.stub(atlasWorker, 'tryWithChallenge');
      });

      afterEach(() => {
        tryWithChallengeMock.restore();
      });

      it('gets ongoing challenges', async () => {
        await atlasWorker.periodicWork();
        expect(challengesRepositoryMock.ongoingChallenges).to.be.calledOnce;
      });

      it('tries to resolve challenges in order until it succeeds', async () => {
        tryWithChallengeMock.withArgs(challenge1).resolves(false);
        tryWithChallengeMock.withArgs(challenge2).resolves(true);
        await atlasWorker.periodicWork();
        expect(tryWithChallengeMock).to.have.been.calledWith(challenge1);
        expect(tryWithChallengeMock).to.have.been.calledWith(challenge2);
        expect(tryWithChallengeMock).to.not.have.been.calledWith(challenge3);
      });

      it('clears outdated failed challenges', async () => {
        await atlasWorker.periodicWork();
        expect(failedChallengesMock.clearOutdatedChallenges).to.be.calledOnce;
      });

      it('starts and ends AtlasChallengeResolution task', async () => {
        await atlasWorker.periodicWork();
        expect(workerTaskTrackingRepositoryMock.tryToBeginWork).to.be.calledBefore(challengesRepositoryMock.ongoingChallenges);
        expect(workerTaskTrackingRepositoryMock.tryToBeginWork).to.be.calledOnceWith('AtlasChallengeResolution');
        expect(workerTaskTrackingRepositoryMock.finishWork).to.be.calledAfter(failedChallengesMock.clearOutdatedChallenges);
        expect(workerTaskTrackingRepositoryMock.finishWork).to.be.calledOnceWith(exampleWorkId);
      });

      it('should end task even if an error was thrown', async () => {
        challengesRepositoryMock.ongoingChallenges.rejects();
        await expect(atlasWorker.periodicWork()).to.be.rejected;
        expect(workerTaskTrackingRepositoryMock.finishWork).to.be.calledOnceWith(exampleWorkId);
      });
    });

    describe('isEnoughFundsToPayForGas', () => {
      async function checkWithNoFunds() {
        mockWeb3.eth.getBalance.withArgs(defaultAccount).resolves(0);
        return await atlasWorker.isEnoughFundsToPayForGas();
      }

      async function checkWithEnoughFunds() {
        mockWeb3.eth.getBalance.withArgs(defaultAccount).resolves(enoughFunds);
        return await atlasWorker.isEnoughFundsToPayForGas();
      }

      it('returns true when account has enough funds to pay for gas', async () => {
        await expect(checkWithEnoughFunds()).to.eventually.be.true;
      });

      it('returns false when account does not have enough funds to pay for gas', async () => {
        await expect(checkWithNoFunds()).to.eventually.be.false;
      });

      it('returns true when account has enough funds after it was out of funds', async () => {
        await checkWithNoFunds();
        await expect(checkWithEnoughFunds()).to.eventually.be.true;
      });

      it('writes message to log when outOfFunds is raised for the first time in a row', async () => {
        await checkWithNoFunds();
        expect(loggerMock.info).to.be.calledOnce;

        await checkWithEnoughFunds();
        expect(loggerMock.info).to.be.calledOnce;

        await checkWithNoFunds();
        expect(loggerMock.info).to.be.calledTwice;
      });

      it('does not write message to log again until still out of funds', async () => {
        await checkWithNoFunds();
        await checkWithNoFunds();
        await checkWithNoFunds();

        expect(loggerMock.info).to.be.calledOnce;
      });
    });

    it('periodicWork does not do anything when account does not have enough funds to pay for gas', async () => {
      mockWeb3.eth.getBalance.resolves('10');
      await expect(atlasWorker.periodicWork()).to.be.eventually.fulfilled;
      await expect(challengesRepositoryMock.ongoingChallenges).to.be.not.called;
    });

    describe('isEnoughAvailableDiskSpace', () => {
      let availableDiskSpace;
      async function checkWithNotEnoughSpace() {
        atlasWorker.requiredFreeDiskSpace = availableDiskSpace * 2;
        return atlasWorker.isEnoughAvailableDiskSpace();
      }

      async function checkWithEnoughSpace() {
        atlasWorker.requiredFreeDiskSpace = availableDiskSpace / 2;
        return atlasWorker.isEnoughAvailableDiskSpace();
      }

      before(async () => {
        availableDiskSpace = await getAvailableDiskSpace();
      });

      it('returns true when the machine has enough free disk space', async () => {
        await expect(checkWithEnoughSpace()).to.eventually.be.true;
      });

      it('returns false when the machine does not have enough free disk space', async () => {
        await expect(checkWithNotEnoughSpace()).to.eventually.be.false;
      });

      it('returns true when the machine got enough free disk space after it was out of it', async () => {
        await checkWithNotEnoughSpace();
        await expect(checkWithEnoughSpace()).to.eventually.be.true;
      });

      it('writes message to log when outOfSpace is raised for the first time in a row', async () => {
        await checkWithNotEnoughSpace();
        expect(loggerMock.info).to.be.calledOnce;

        await checkWithEnoughSpace();
        expect(loggerMock.info).to.be.calledOnce;

        await checkWithNotEnoughSpace();
        expect(loggerMock.info).to.be.calledTwice;
      });

      it('does not write message to log again until still not enough free space', async () => {
        await checkWithNotEnoughSpace();
        await checkWithNotEnoughSpace();
        await checkWithNotEnoughSpace();

        expect(loggerMock.info).to.be.calledOnce;
      });

      it('periodicWork does not do anything when there is less free space than required', async () => {
        atlasWorker.requiredFreeDiskSpace = availableDiskSpace * 2;
        await expect(atlasWorker.periodicWork()).to.be.eventually.fulfilled;
        await expect(challengesRepositoryMock.ongoingChallenges).to.be.not.called;
      });
    });
  });

  it('health checks', async () => {
    const {status} = await chai.request(`http://localhost:${port}`).get('/health');
    expect(status).to.eql(200);
  });

  describe('prometheus metrics', () => {
    let isTurnToResolveMock;
    beforeEach(async () => {
      isTurnToResolveMock = sinon.stub(atlasWorker, 'isTurnToResolve');
      isTurnToResolveMock.resolves();
      isTurnToResolveMock.returns(true);
      challengesRepositoryMock.ongoingChallenges.resolves([
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
      sinon.stub(atlasWorker, 'tryToResolve');
      atlasWorker.tryToResolve.rejects();

      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_challenges_total{status="failed"} 1');
      expect(metrics).to.not.include('atlas_challenges_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_fetch"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_resolve"}');
    });

    it('records metrics on challenges that should not be fetched', async () => {
      atlasWorker.challengeStrategy.shouldFetchBundle.returns(false);

      await atlasWorker.periodicWork();
      const metrics = await readMetrics(port);
      expect(metrics).to.include('atlas_challenges_total{status="should_not_fetch"} 1');
      expect(metrics).to.not.include('atlas_challenges_total{status="resolved"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="failed"}');
      expect(metrics).to.not.include('atlas_challenges_total{status="should_not_resolve"}');
    });

    it('records metrics on challenges that should not be resolved', async () => {
      atlasWorker.challengeStrategy.shouldResolve.returns(false);

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
