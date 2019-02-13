/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ChallengesRepository from '../../src/services/challenges_repository';
import sinon from 'sinon';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Challenges repository', () => {
  let challengeWrapperMock;
  let configWrapperMock;
  let activeChallengesCacheMock;
  let blockchainStateWrapperMock;
  let challengesEventEmitterWrapper;
  let challengesRepository;

  describe('prepareChallengeEvent', () => {
    const sheltererId = 1;
    const bundleId = 2;
    const challengeId = 3;
    const count = 1;
    const events = [
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId,
          count
        },
        blockNumber: 1,
        logIndex: 0
      },
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId: 100,
          count
        },
        blockNumber: 2,
        logIndex: 0
      },
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId,
          count
        },
        blockNumber: 2,
        logIndex: 1
      }];

    beforeEach(() => {
      challengesRepository = new ChallengesRepository();
    });

    it('extracts the blockNumber, logIndex, the fields specified in selector and appends event type', async () => {
      expect(challengesRepository.prepareChallengeEvent(events, ['challengeId', 'sheltererId', 'bundleId', 'count'])).to.deep.equal([
        {sheltererId, bundleId, challengeId, count, blockNumber: 1, logIndex: 0},
        {sheltererId, bundleId, challengeId: 100, count, blockNumber: 2, logIndex: 0},
        {sheltererId, bundleId, challengeId, count, blockNumber: 2, logIndex: 1}
      ]);
      expect(challengesRepository.prepareChallengeEvent(events, ['challengeId'])).to.deep.equal([
        {challengeId, blockNumber: 1, logIndex: 0},
        {challengeId: 100, blockNumber: 2, logIndex: 0},
        {challengeId, blockNumber: 2, logIndex: 1}
      ]);
    });
  });

  describe('ongoingChallenges', () => {
    const sheltererId = 1;
    const bundleId = 2;
    const challengeId = 3;
    const fromBlock = 4;
    const latestBlock = 7;
    const count = 1;
    const challengeDuration = 5;
    const events = [
      {
        blockNumber: 4,
        logIndex: 0,
        returnValues: {
          sheltererId,
          bundleId,
          challengeId,
          count
        }
      }, {
        blockNumber: 2,
        logIndex: 0,
        returnValues: {
          sheltererId,
          bundleId,
          challengeId: 100,
          count
        }
      }];
    const resolvedEvents = [
      {
        blockNumber: 3,
        logIndex: 0,
        returnValues: {
          bundleId,
          sheltererId,
          challengeId: 'resolved',
          resolverId: 'someResolverId'
        }
      }];
    const timedOutEvents = [
      {
        blockNumber: 5,
        logIndex: 0,
        returnValues:{
          bundleId,
          sheltererId,
          challengeId: 'timedOut'
        }
      }];

    beforeEach(() => {
      challengeWrapperMock = {
        earliestMeaningfulBlock: sinon.stub().resolves(fromBlock),
        defaultAddress: 'defaultAddress'
      };
      configWrapperMock = {
        challengeDuration: sinon.stub().resolves(challengeDuration)
      };
      activeChallengesCacheMock = {
        applyIncomingChallengeEvents: sinon.stub(),
        activeChallenges: ['activeChallenges']
      };
      blockchainStateWrapperMock = {
        getCurrentBlockNumber: sinon.stub()
      };
      challengesEventEmitterWrapper = {
        challenges: sinon.stub().resolves(events),
        resolvedChallenges: sinon.stub().resolves(resolvedEvents),
        timedOutChallenges: sinon.stub().resolves(timedOutEvents)
      };
      blockchainStateWrapperMock.getCurrentBlockNumber.onFirstCall()
        .resolves(latestBlock)
        .onSecondCall()
        .resolves(latestBlock + 3);
      challengesRepository = new ChallengesRepository(challengeWrapperMock, challengesEventEmitterWrapper, configWrapperMock, blockchainStateWrapperMock, activeChallengesCacheMock);
      sinon.spy(challengesRepository, 'prepareChallengeEvent');
    });

    it('on first call: gets challenges from earliest possible block and caches them', async () => {
      const result = await challengesRepository.ongoingChallenges();
      expect(configWrapperMock.challengeDuration).to.be.calledOnce;
      expect(challengeWrapperMock.earliestMeaningfulBlock).to.be.calledWith(challengeDuration);
      expect(challengesEventEmitterWrapper.challenges).to.be.calledWith(fromBlock, latestBlock);
      expect(challengesEventEmitterWrapper.resolvedChallenges).to.be.calledWith(fromBlock, latestBlock);
      expect(challengesEventEmitterWrapper.timedOutChallenges).to.be.calledWith(fromBlock, latestBlock);
      expect(result).to.deep.equal(activeChallengesCacheMock.activeChallenges);
    });

    it('on second call: gets challenges since previously resolved block', async () => {
      await challengesRepository.ongoingChallenges();
      await challengesRepository.ongoingChallenges();
      expect(challengesEventEmitterWrapper.challenges).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(challengesEventEmitterWrapper.resolvedChallenges).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(challengesEventEmitterWrapper.timedOutChallenges).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(challengesRepository.lastSavedBlock).to.equal(latestBlock + 3);
    });

    it('does not fetch new challenges when currentBlock equals lastSavedBlock', async () => {
      blockchainStateWrapperMock.getCurrentBlockNumber.onSecondCall().resolves(latestBlock);
      await challengesRepository.ongoingChallenges();
      await challengesRepository.ongoingChallenges();
      expect(challengesEventEmitterWrapper.challenges).to.be.calledOnce;
      expect(challengesEventEmitterWrapper.resolvedChallenges).to.be.calledOnce;
      expect(challengesEventEmitterWrapper.timedOutChallenges).to.be.calledOnce;
    });

    it('adds new challenges to cache, decreases active count on resolved and removes timed out', async () => {
      await challengesRepository.ongoingChallenges();
      expect(activeChallengesCacheMock.applyIncomingChallengeEvents).to.be.calledOnceWithExactly(
        challengesRepository.prepareChallengeEvent(events, ['challengeId', 'sheltererId', 'bundleId', 'count']),
        challengesRepository.prepareChallengeEvent(resolvedEvents, ['challengeId']),
        challengesRepository.prepareChallengeEvent(timedOutEvents, ['challengeId'])
      );
    });

    it('calls own methods with correct params', async () => {
      await challengesRepository.ongoingChallenges();
      expect(challengesRepository.prepareChallengeEvent).to.be.calledThrice;
      expect(challengesRepository.prepareChallengeEvent).to.be.calledWith(events);
      expect(challengesRepository.prepareChallengeEvent).to.be.calledWith(resolvedEvents);
      expect(challengesRepository.prepareChallengeEvent).to.be.calledWith(timedOutEvents);
    });
  });

  describe('resolveChallenge', () => {
    const challengeId = '0x123';

    beforeEach(() => {
      challengeWrapperMock = {
        resolve: sinon.stub(),
        canResolve: sinon.stub().resolves(true)
      };
      challengesRepository = new ChallengesRepository(challengeWrapperMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengesRepository.resolveChallenge(challengeId);
      expect(challengeWrapperMock.resolve).to.be.calledOnceWith(challengeId);
    });

    it('throws error if cannot resolve challenge', async () => {
      challengeWrapperMock.canResolve.resolves(false);
      await expect(challengesRepository.resolveChallenge(challengeId)).to.be.eventually.rejected;
      expect(challengeWrapperMock.resolve).to.be.not.called;
    });
  });
});
