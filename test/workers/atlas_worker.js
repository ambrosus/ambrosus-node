/*
Copyright: Ambrosus Technologies GmbH
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
import AtlasChallengeParticipationStrategy from '../../src/workers/atlas_strategies/atlas_challenge_resolution_strategy';
import {connectToMongo} from '../../src/utils/db_utils';
import config from '../../config/config';
import Web3 from 'web3';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Atlas Worker', () => {
  const defaultAccount = '0x123';
  const exampleBalance = '10000000000000000000';
  const fetchedBundle = {bundleId: 'fetchedBundle'};
  const exampleWorkId = 'workid';
  const workerInterval = 10;
  const retryTimeout = 14;
  const {utils} = new Web3();
  let atlasWorker;
  let challengesRepositoryMock;
  let workerTaskTrackingRepositoryMock;
  let failedChallengesMock;
  let dataModelEngineMock;
  let mockWorkerLogRepository;
  let mockWeb3;
  let strategyMock;
  let loggerMock;
  let shouldFetchBundleStub;
  let shouldResolveChallengeStub;

  beforeEach(async () => {
    mockWeb3 = {
      eth: {
        defaultAccount,
        getBalance: sinon.stub().resolves(exampleBalance),
        getNodeInfo: () => Promise.resolve()
      },
      utils
    };
    const {client: mongoClient} = await connectToMongo(config);
    challengesRepositoryMock = {
      ongoingChallenges: sinon.stub(),
      resolveChallenge: sinon.stub()
    };
    failedChallengesMock = {
      rememberFailedChallenge: sinon.spy(),
      didChallengeFailRecently: sinon.stub().returns(false),
      clearOutdatedChallenges: sinon.spy()
    };
    workerTaskTrackingRepositoryMock = {
      tryToBeginWork: sinon.stub().resolves(exampleWorkId),
      finishWork: sinon.spy()
    };
    dataModelEngineMock = {
      downloadBundle: sinon.stub().resolves(fetchedBundle),
      cleanupBundles: sinon.spy(),
      updateShelteringExpirationDate: sinon.stub()
    };
    mockWorkerLogRepository = {
      storeLog: sinon.stub()
    };
    strategyMock = new AtlasChallengeParticipationStrategy();
    sinon.stub(strategyMock, 'workerInterval').get(() => workerInterval);
    sinon.stub(strategyMock, 'retryTimeout').get(() => retryTimeout);
    shouldFetchBundleStub = sinon.stub(strategyMock, 'shouldFetchBundle').resolves(true);
    shouldResolveChallengeStub = sinon.stub(strategyMock, 'shouldResolveChallenge').resolves(true);
    sinon.stub(strategyMock, 'afterChallengeResolution');
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
      strategyMock,
      loggerMock,
      mongoClient,
      config.serverPort
    );

    atlasWorker.beforeWorkLoop();
  });

  afterEach(async () => {
    await atlasWorker.afterWorkLoop();
  });

  it('copies the work interval from the strategy', () => {
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
      expect(await atlasWorker.tryToDownload(challenge1)).to.equal(fetchedBundle);
      expect(dataModelEngineMock.downloadBundle).to.be.calledWith(bundleId, sheltererId);
    });

    it('tryToResolve resolves a challenge and sets expiration date', async () => {
      await atlasWorker.tryToResolve(fetchedBundle, challenge1);
      expect(challengesRepositoryMock.resolveChallenge).to.be.calledWith(challengeId);
      expect(dataModelEngineMock.updateShelteringExpirationDate).to.be.calledWith(fetchedBundle.bundleId);
    });

    describe('tryWithChallenge', () => {
      let tryToDownloadMock;
      let tryToResolveMock;
      const bundle = 'bundle';

      beforeEach(() => {
        tryToDownloadMock = sinon.stub(atlasWorker, 'tryToDownload');
        tryToResolveMock = sinon.stub(atlasWorker, 'tryToResolve');

        shouldFetchBundleStub.resolves(true);
        tryToDownloadMock.resolves(bundle);
        shouldResolveChallengeStub.returns(true);
        tryToResolveMock.resolves();
      });

      afterEach(() => {
        tryToDownloadMock.restore();
        tryToResolveMock.restore();
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
        shouldResolveChallengeStub.returns(false);
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(false);
        expect(shouldResolveChallengeStub).to.have.been.calledWith('bundle');
        expect(tryToResolveMock).to.not.have.been.called;
        expect(failedChallengesMock.rememberFailedChallenge).to.not.have.been.called;
      });

      it('returns false and marks challenge as failed if the resolution attempt fails', async () => {
        tryToResolveMock.rejects();
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(false);
        expect(tryToResolveMock).to.have.been.calledWith(bundle, challenge1);
        expect(failedChallengesMock.rememberFailedChallenge).to.be.calledOnceWith(challenge1.challengeId, retryTimeout);
      });

      it('returns true if everything goes ok', async () => {
        expect(await atlasWorker.tryWithChallenge(challenge1)).to.equal(true);
        expect(strategyMock.afterChallengeResolution).to.have.been.calledWith(bundle);
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

      it('clears outdated challenges', async () => {
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
      it('isOutOfFunds property is false after atlas worker was initialized', async () => {
        expect(atlasWorker.isOutOfFunds).to.be.false;
      });

      it('returns true when account has enough funds to pay for gas', async () => {
        expect(await atlasWorker.isEnoughFundsToPayForGas()).to.be.true;
        expect(mockWeb3.eth.getBalance).to.be.calledWith(defaultAccount);
      });

      it('sets isOutOfFunds property to false when account has enough funds', async () => {
        atlasWorker.isOutOfFunds = undefined;
        await atlasWorker.isEnoughFundsToPayForGas();
        expect(atlasWorker.isOutOfFunds).to.be.false;
      });

      it('returns false when account does not have enough funds to pay for gas', async () => {
        mockWeb3.eth.getBalance.resolves('23123');
        expect(await atlasWorker.isEnoughFundsToPayForGas()).to.be.false;
      });

      it('sets isOutOfFunds property to true when account does not have enough funds to pay for gas', async () => {
        mockWeb3.eth.getBalance.resolves('23123');
        atlasWorker.isOutOfFunds = undefined;
        await atlasWorker.isEnoughFundsToPayForGas();
        expect(atlasWorker.isOutOfFunds).to.be.true;
      });

      it('writes message to log when outOfFunds is raised for the first time in a row', async () => {
        mockWeb3.eth.getBalance.resolves('23123');
        atlasWorker.isOutOfFunds = false;
        expect(await atlasWorker.isEnoughFundsToPayForGas()).to.be.false;
        expect(loggerMock.info).to.be.calledOnce;
      });

      it('does not write message to log when outOfFunds is raised the second or more time in a row', async () => {
        mockWeb3.eth.getBalance.resolves('23123');
        atlasWorker.isOutOfFunds = true;
        expect(await atlasWorker.isEnoughFundsToPayForGas()).to.be.false;
        expect(loggerMock.info).to.be.not.called;
      });
    });

    it('periodicWork does not do anything when account does not have enough funds to pay for gas', async () => {
      mockWeb3.eth.getBalance.resolves('10');
      await expect(atlasWorker.periodicWork()).to.be.eventually.fulfilled;
      await expect(challengesRepositoryMock.ongoingChallenges).to.be.not.called;
    });
  });

  it('health checks', async () => {
    const {port} = atlasWorker.server.address();
    const {status} = await chai.request(`http://localhost:${port}`).get('/health');
    expect(status).to.eql(200);
  });
});
