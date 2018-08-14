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
import ChallengeResolutionStrategy from '../../src/workers/atlas_strategies/challenge_resolution_strategy';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Atlas Worker', () => {
  const defaultAccount = '0x123';
  const fetchedBundle = 'fetchedBundle';
  const challengePullingInterval = 10;
  let atlasWorker;
  let challengesRepositoryMock;
  let dataModelEngineMock;
  let strategyMock;
  let loggerMock;
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
      downloadBundle: sinon.stub().resolves(fetchedBundle)
    };
    strategyMock = new ChallengeResolutionStrategy();
    sinon.stub(strategyMock, 'challengePullingInterval').get(() => challengePullingInterval);
    sinon.stub(strategyMock, 'shouldFetchBundle').resolves(true);
    sinon.stub(strategyMock, 'shouldResolveChallenge').resolves(true);
    sinon.stub(strategyMock, 'afterChallengeResolution');
    loggerMock = {
      info: sinon.spy(),
      error: sinon.spy()
    };
    atlasWorker = new AtlasWorker(mockWeb3, dataModelEngineMock, challengesRepositoryMock, strategyMock, loggerMock);
  });

  describe('challenge resolution strategy', () => {
    const sheltererId = 'shelterer';
    const bundleId = 'bundle';
    const challengeId = 'challenge';

    const challenges =  Array(4).fill({sheltererId, bundleId, challengeId});

    beforeEach(() => {
      challengesRepositoryMock.ongoingChallenges.resolves(challenges);
    });

    it('tryToResolve downloads the bundle and resolves a challenge', async () => {
      await atlasWorker.tryToResolve({sheltererId, bundleId, challengeId});
      expect(dataModelEngineMock.downloadBundle).to.be.calledWith(bundleId, sheltererId);
      expect(challengesRepositoryMock.resolveChallenge).to.be.calledWith(challengeId);
    });

    it('tryToResolve calls strategy methods with fetched bundle', async () => {
      await atlasWorker.tryToResolve({sheltererId, bundleId, challengeId});
      expect(atlasWorker.interval).to.equal(challengePullingInterval);
      expect(strategyMock.shouldFetchBundle).to.be.calledWith({sheltererId, bundleId, challengeId});
      expect(strategyMock.shouldResolveChallenge).to.be.calledWith(fetchedBundle);
      expect(strategyMock.afterChallengeResolution).to.be.calledWith(fetchedBundle);
    });

    it('calls tryToResolve for each challenge', async () => {
      await atlasWorker.periodicWork();
      expect(dataModelEngineMock.downloadBundle).to.callCount(4);
    });

    it('periodicWork does not throw when tryToResolve fails', async () => {
      dataModelEngineMock.downloadBundle.rejects();
      await expect(atlasWorker.periodicWork()).to.be.eventually.fulfilled;
    });
  });
});
