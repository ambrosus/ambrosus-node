/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import AtlasWorker from '../../src/workers/atlas_worker';
import AtlasChallengeParticipationStrategy from '../../src/workers/atlas_strategies/atlas_challenge_resolution_strategy';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Atlas Worker', () => {
  const defaultAccount = '0x123';
  const fetchedBundle = {bundleId: 'fetchedBundle'};
  const workerInterval = 10;
  let atlasWorker;
  let challengesRepositoryMock;
  let dataModelEngineMock;
  let mockWorkerLogRepository;
  let strategyMock;
  let loggerMock;
  let shouldFetchBundleStub;
  let shouldResolveChallengeStub;
  let mockWeb3;

  beforeEach(() => {
    mockWeb3 = {
      eth: {
        defaultAccount
      }
    };
    challengesRepositoryMock = {
      ongoingChallenges: sinon.stub(),
      resolveChallenge: sinon.stub()
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
    shouldFetchBundleStub = sinon.stub(strategyMock, 'shouldFetchBundle').resolves(true);
    shouldResolveChallengeStub = sinon.stub(strategyMock, 'shouldResolveChallenge').resolves(true);
    sinon.stub(strategyMock, 'afterChallengeResolution');
    loggerMock = {
      info: sinon.spy(),
      error: sinon.spy()
    };
    atlasWorker = new AtlasWorker(mockWeb3, dataModelEngineMock, mockWorkerLogRepository, challengesRepositoryMock, strategyMock, loggerMock);
  });

  describe('challenge resolution strategy', () => {
    const sheltererId = 'shelterer';
    const bundleId = 'bundle';
    const challengeId = 'challenge';
    const challenge = {sheltererId, bundleId, challengeId};
    const challenges =  Array(4).fill(challenge);

    beforeEach(() => {
      challengesRepositoryMock.ongoingChallenges.resolves(challenges);
    });

    it('tryToDownload downloads the bundle', async () => {
      expect(await atlasWorker.tryToDownload(challenge)).to.equal(fetchedBundle);
      expect(dataModelEngineMock.downloadBundle).to.be.calledWith(bundleId, sheltererId);
    });

    it('tryToResolve resolves a challenge and sets expiration date', async () => {
      await atlasWorker.tryToResolve(fetchedBundle, challenge);
      expect(challengesRepositoryMock.resolveChallenge).to.be.calledWith(challengeId);
      expect(dataModelEngineMock.updateShelteringExpirationDate).to.be.calledWith(fetchedBundle.bundleId);
    });

    it('periodicWork calls strategy methods for each challenge', async () => {
      await atlasWorker.periodicWork();
      expect(atlasWorker.interval).to.equal(workerInterval);
      expect(strategyMock.shouldFetchBundle).to.be.calledWith(challenge);
      expect(strategyMock.shouldResolveChallenge).to.be.calledWith(fetchedBundle);
      expect(strategyMock.afterChallengeResolution).to.be.calledWith(fetchedBundle);
      expect(strategyMock.shouldFetchBundle).to.callCount(4);
      expect(strategyMock.shouldResolveChallenge).to.callCount(4);
      expect(strategyMock.afterChallengeResolution).to.callCount(4);
      expect(dataModelEngineMock.cleanupBundles).to.be.calledOnce;
    });

    it('periodic work does not download if shouldFetchBundle is false', async () => {
      shouldFetchBundleStub.resolves(false);
      await atlasWorker.periodicWork();
      expect(dataModelEngineMock.downloadBundle).to.be.not.called;
    });

    it('periodic work does not resolve if shouldFetchBundle is false', async () => {
      shouldResolveChallengeStub.resolves(false);
      await atlasWorker.periodicWork();
      expect(dataModelEngineMock.downloadBundle).to.be.called;
      expect(challengesRepositoryMock.resolveChallenge).to.be.not.called;
    });

    it('periodicWork does not throw when tryToResolve fails', async () => {
      dataModelEngineMock.downloadBundle.rejects();
      await expect(atlasWorker.periodicWork()).to.be.eventually.fulfilled;
    });
  });
});
