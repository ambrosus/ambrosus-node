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

describe.only('Challenges repository', () => {
  let challengeWrapperMock;
  let configWrapperMock;
  let activeChallengesCacheMock;
  let blockchainStateWrapperMock;
  let challengesRepository;

  describe('sortChallenges', () => {
    const events = [
      {blockNumber: 5},
      {blockNumber: 9},
      {blockNumber: 2}
    ];

    beforeEach(() => {
      challengesRepository = new ChallengesRepository();
    });

    it('in increasing blockNumber order', () => {
      expect(challengesRepository.sortChallenges(events)).to.deep.equal([{blockNumber: 2}, {blockNumber: 5}, {blockNumber: 9}]);
    });
  });

  describe('extractChallengeFromEvent', () => {
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
        blockNumber: 1
      },
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId: 100,
          count
        },
        blockNumber: 2
      },
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId,
          count
        },
        blockNumber: 3
      }];
    const challenges = [
      {sheltererId, bundleId, challengeId, count, blockNumber: 1},
      {sheltererId, bundleId, challengeId: 100, count, blockNumber: 2},
      {sheltererId, bundleId, challengeId, count, blockNumber: 3}];

    beforeEach(() => {
      challengesRepository = new ChallengesRepository();
    });

    it('extracts the blockNumber and the fields specified in selector', async () => {
      expect(challengesRepository.extractChallengeFromEvent(events, ['challengeId', 'sheltererId', 'bundleId', 'count'])).to.deep.equal(challenges);
      expect(challengesRepository.extractChallengeFromEvent(events, ['challengeId'])).to.deep.equal([{challengeId, blockNumber: 1}, {challengeId: 100, blockNumber: 2}, {challengeId, blockNumber: 3}]);
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
        returnValues: {
          sheltererId,
          bundleId,
          challengeId,
          count
        }
      }, {
        blockNumber: 2,
        returnValues: {
          sheltererId,
          bundleId,
          challengeId: 100,
          count
        }
      }];
    const resolvedEvents = [{blockNumber: 3, returnValues: {bundleId, sheltererId, challengeId: 'resolved', resolverId: 'someResolverId'}}];
    const timedOutEvents = [{blockNumber: 5, returnValues: {bundleId, sheltererId, challengeId: 'timedOut'}}];
    const sortedEvents = 'sortedEvents';

    beforeEach(() => {
      challengeWrapperMock = {
        challenges: sinon.stub().resolves(events),
        resolvedChallenges: sinon.stub().resolves(resolvedEvents),
        timedOutChallenges: sinon.stub().resolves(timedOutEvents),
        earliestMeaningfulBlock: sinon.stub().resolves(fromBlock),
        defaultAddress: 'defaultAddress'
      };
      configWrapperMock = {
        challengeDuration: sinon.stub().resolves(challengeDuration)
      };
      activeChallengesCacheMock = {
        add: sinon.stub(),
        decreaseActiveCount: sinon.stub(),
        expire: sinon.stub(),
        activeChallenges: ['activeChallenges']
      };
      blockchainStateWrapperMock = {
        getCurrentBlock: sinon.stub()
      };
      blockchainStateWrapperMock.getCurrentBlock.onFirstCall()
        .resolves(latestBlock)
        .onSecondCall()
        .resolves(latestBlock + 3);
      challengesRepository = new ChallengesRepository(challengeWrapperMock, configWrapperMock, blockchainStateWrapperMock, activeChallengesCacheMock);
      sinon.spy(challengesRepository, 'extractChallengeFromEvent');
      sinon.stub(challengesRepository, 'sortChallenges').returns(sortedEvents);
    });

    it('on first call: gets challenges from earliest possible block and caches them', async () => {
      const result = await challengesRepository.ongoingChallenges();
      expect(configWrapperMock.challengeDuration).to.be.calledOnce;
      expect(challengeWrapperMock.earliestMeaningfulBlock).to.be.calledWith(challengeDuration);
      expect(challengeWrapperMock.challenges).to.be.calledWith(fromBlock, latestBlock);
      expect(challengeWrapperMock.resolvedChallenges).to.be.calledWith(fromBlock, latestBlock);
      expect(challengeWrapperMock.timedOutChallenges).to.be.calledWith(fromBlock, latestBlock);
      expect(result).to.deep.equal(sortedEvents);
    });

    it('on second call: gets challenges since previously resolved block', async () => {
      await challengesRepository.ongoingChallenges();
      await challengesRepository.ongoingChallenges();
      expect(challengeWrapperMock.challenges).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(challengeWrapperMock.resolvedChallenges).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(challengeWrapperMock.timedOutChallenges).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(challengesRepository.lastSavedBlock).to.equal(latestBlock + 3);
    });

    it('adds new challenges to cache, decreases active count on resolved and removes timeouted', async () => {
      await challengesRepository.ongoingChallenges();
      expect(activeChallengesCacheMock.add).to.be.calledOnceWithExactly([
        {
          blockNumber: 4,
          sheltererId,
          bundleId,
          challengeId,
          count
        }, {
          blockNumber: 2,
          sheltererId,
          bundleId,
          challengeId: 100,
          count
        }
      ]);
      expect(activeChallengesCacheMock.expire).to.be.calledOnceWithExactly([{challengeId: 'timedOut', blockNumber: 5}]);
      expect(activeChallengesCacheMock.decreaseActiveCount).to.be.calledOnceWithExactly([{blockNumber: 3, challengeId: 'resolved', resolverId: 'someResolverId'}]);
    });

    it('calls own methods with correct params', async () => {
      await challengesRepository.ongoingChallenges();
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledThrice;
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledWith(events);
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledWith(resolvedEvents);
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledWith(timedOutEvents);
      expect(challengesRepository.sortChallenges).to.be.calledWith(activeChallengesCacheMock.activeChallenges);
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
