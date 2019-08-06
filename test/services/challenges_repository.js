/*
Copyright: Ambrosus Inc.
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

  describe('prepareResolutionEvent', () => {
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
      expect(challengesRepository.prepareEvents(events, ['challengeId', 'sheltererId', 'bundleId', 'count'])).to.deep.equal([
        {sheltererId, bundleId, challengeId, count, blockNumber: 1, logIndex: 0},
        {sheltererId, bundleId, challengeId: 100, count, blockNumber: 2, logIndex: 0},
        {sheltererId, bundleId, challengeId, count, blockNumber: 2, logIndex: 1}
      ]);
      expect(challengesRepository.prepareEvents(events, ['challengeId'])).to.deep.equal([
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
        returnValues: {
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
        applyIncomingResolutionEvents: sinon.stub(),
        activeResolutions: ['activeResolutions']
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
      sinon.spy(challengesRepository, 'prepareEvents');
    });

    it('on first call: gets challenges from earliest possible block and caches them', async () => {
      const result = await challengesRepository.ongoingResolutions();
      expect(configWrapperMock.challengeDuration).to.be.calledOnce;
      expect(challengeWrapperMock.earliestMeaningfulBlock).to.be.calledWith(challengeDuration);
      expect(challengesEventEmitterWrapper.challenges).to.be.calledWith(fromBlock, latestBlock);
      expect(challengesEventEmitterWrapper.resolvedChallenges).to.be.calledWith(fromBlock, latestBlock);
      expect(challengesEventEmitterWrapper.timedOutChallenges).to.be.calledWith(fromBlock, latestBlock);
      expect(result).to.deep.equal(activeChallengesCacheMock.activeResolutions);
    });

    it('on second call: gets challenges since previously resolved block', async () => {
      await challengesRepository.ongoingResolutions();
      await challengesRepository.ongoingResolutions();
      expect(challengesEventEmitterWrapper.challenges).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(challengesEventEmitterWrapper.resolvedChallenges).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(challengesEventEmitterWrapper.timedOutChallenges).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(challengesRepository.lastSavedBlock).to.equal(latestBlock + 3);
    });

    it('does not fetch new challenges when currentBlock equals lastSavedBlock', async () => {
      blockchainStateWrapperMock.getCurrentBlockNumber.onSecondCall().resolves(latestBlock);
      await challengesRepository.ongoingResolutions();
      await challengesRepository.ongoingResolutions();
      expect(challengesEventEmitterWrapper.challenges).to.be.calledOnce;
      expect(challengesEventEmitterWrapper.resolvedChallenges).to.be.calledOnce;
      expect(challengesEventEmitterWrapper.timedOutChallenges).to.be.calledOnce;
    });

    it('adds new challenges to cache, decreases active count on resolved and removes timed out', async () => {
      await challengesRepository.ongoingResolutions();
      expect(activeChallengesCacheMock.applyIncomingResolutionEvents).to.be.calledOnceWithExactly(
        challengesRepository.prepareEvents(events, ['challengeId', 'sheltererId', 'bundleId', 'count']),
        challengesRepository.prepareEvents(resolvedEvents, ['challengeId']),
        challengesRepository.prepareEvents(timedOutEvents, ['challengeId'])
      );
    });

    it('calls own methods with correct params', async () => {
      await challengesRepository.ongoingResolutions();
      expect(challengesRepository.prepareEvents).to.be.calledThrice;
      expect(challengesRepository.prepareEvents).to.be.calledWith(events);
      expect(challengesRepository.prepareEvents).to.be.calledWith(resolvedEvents);
      expect(challengesRepository.prepareEvents).to.be.calledWith(timedOutEvents);
    });

    it('fetches events with steps - collects all events', async () => {
      const fetchEvents = sinon.stub();
      fetchEvents.withArgs(0, 0)
        .resolves([{blockNumber: 0, logIndex: 0}]);
      fetchEvents.withArgs(1, 1)
        .resolves([{blockNumber: 1, logIndex: 1}]);
      fetchEvents.withArgs(2, 2)
        .resolves([{blockNumber: 2, logIndex: 2}]);
      const result = await challengesRepository.collectEventsWithStep(0, 2, 1, fetchEvents, []);
      expect(result).to.deep.eq([{blockNumber: 0, logIndex: 0}, {blockNumber: 1, logIndex: 1}, {blockNumber: 2, logIndex: 2}]);
    });

    it('fetches events with steps - divisible range', async () => {
      const fetchEvents = sinon.stub().resolves([]);
      await challengesRepository.collectEventsWithStep(151, 300, 50, fetchEvents, []);
      expect(fetchEvents).to.have.been.calledWith(151, 200);
      expect(fetchEvents).to.have.been.calledWith(201, 250);
      expect(fetchEvents).to.have.been.calledWith(251, 300);
    });

    it('fetches events with steps - range with remainder', async () => {
      const fetchEvents = sinon.stub().resolves([]);
      await challengesRepository.collectEventsWithStep(151, 215, 50, fetchEvents, []);
      expect(fetchEvents).to.have.been.calledWith(151, 200);
      expect(fetchEvents).to.have.been.calledWith(201, 215);
    });

    it('fetches events with steps - range of 1', async () => {
      const fetchEvents = sinon.stub()
        .withArgs(5, 5)
        .resolves([{blockNumber: 0, logIndex: 0}]);
      const result = await challengesRepository.collectEventsWithStep(5, 5, 100, fetchEvents, []);
      expect(result).to.deep.eq([{blockNumber: 0, logIndex: 0}]);
    });
  });

  describe('resolveChallenge', () => {
    const sheltererId = 'shelterer';
    const bundleId = 'bundle';
    const challengeId = 'challenge';
    const challenge1 = {sheltererId, bundleId, challengeId, bundleNumber: 1};

    beforeEach(() => {
      challengeWrapperMock = {
        resolve: sinon.stub(),
        canResolve: sinon.stub().resolves(true)
      };
      challengesRepository = new ChallengesRepository(challengeWrapperMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengesRepository.resolve(challenge1);
      expect(challengeWrapperMock.resolve).to.be.calledOnceWith(challenge1.challengeId);
    });

    it('throws error if cannot resolve challenge', async () => {
      challengeWrapperMock.canResolve.resolves(false);
      await expect(challengesRepository.resolve(challenge1)).to.be.eventually.rejected;
      expect(challengeWrapperMock.resolve).to.be.not.called;
    });
  });

  describe('getChallengeExpirationTime', () => {
    const challengeId = '0xdeadbeef';
    const exampleChallengeDuration = '123';
    const exampleChallengeStartTime = '297';
    const expectedChallengeEndTime = 420000;

    beforeEach(() => {
      challengeWrapperMock = {
        getChallengeCreationTime: sinon.stub()
          .withArgs(challengeId)
          .resolves(exampleChallengeStartTime)
      };
      configWrapperMock = {
        challengeDuration: sinon.stub().resolves(exampleChallengeDuration)
      };
      challengesRepository = new ChallengesRepository(challengeWrapperMock, null, configWrapperMock);
    });

    it('adds challenge start timestamp and challenge duration', async () => {
      expect(await challengesRepository.getExpirationTimeInMs(challengeId)).to.equal(expectedChallengeEndTime);
    });
  });
});
