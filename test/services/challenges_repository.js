/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromissed from 'chai-as-promised';
import ChallengesRepository from '../../src/services/challenges_repository';
import sinon from 'sinon';

chai.use(sinonChai);
chai.use(chaiAsPromissed);
const {expect} = chai;

describe('Challenges repository', () => {
  let challengeWrapperMock;
  let configWrapperMock;
  let challengesRepository;
  const ownAddress = 'ownAddress';
  const otherAddress = 'otherAddress';

  describe('filterOutFinishedChallenges', () => {
    beforeEach(() => {
      challengesRepository = new ChallengesRepository();
    });

    const allChallenges = [
      {challengeId: '1', count: 3},
      {challengeId: '2', count: 2},
      {challengeId: '3', count: 3},
      {challengeId: '4', count: 2}
    ];
    const resolvedChallenges = [
      {challengeId: '1', resolverId: ownAddress},
      {challengeId: '2', resolverId: otherAddress},
      {challengeId: '2', resolverId: ownAddress},
      {challengeId: '2', resolverId: otherAddress},
      {challengeId: '4', resolverId: otherAddress}
    ];
    const timedOutChallenges = [
      {challengeId: '2'},
      {challengeId: '3'},
      {challengeId: '7'}
    ];

    it('should remove challenges that were fully resolved (resolutions count match start count)', async () => {
      expect(challengesRepository.filterOutFinishedChallenges(allChallenges, resolvedChallenges, [], 'nonSignificant')).to.deep.equal([
        {challengeId: '1', count: 3},
        {challengeId: '3', count: 3},
        {challengeId: '4', count: 2}
      ]);
    });

    it('should remove challenges that were resolved by the current atlas', async () => {
      expect(challengesRepository.filterOutFinishedChallenges(allChallenges, resolvedChallenges, [], ownAddress)).to.deep.equal([
        {challengeId: '3', count: 3},
        {challengeId: '4', count: 2}
      ]);
    });

    it('should remove challenge when timed out', async () => {
      expect(challengesRepository.filterOutFinishedChallenges(allChallenges, [], timedOutChallenges, 'nonSignificant')).to.deep.equal([
        {challengeId: '1', count: 3},
        {challengeId: '4', count: 2}
      ]);
    });

    it('should work in complex scenario', async () => {
      expect(challengesRepository.filterOutFinishedChallenges(allChallenges, resolvedChallenges, timedOutChallenges, ownAddress)).to.deep.equal([
        {challengeId: '4', count: 2}
      ]);
    });
  });

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
      },
      {
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
    const notFinishedEvents = 'notFinishedEvents';
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
      challengesRepository = new ChallengesRepository(challengeWrapperMock, configWrapperMock);
      sinon.spy(challengesRepository, 'extractChallengeFromEvent');
      sinon.stub(challengesRepository, 'filterOutFinishedChallenges').returns(notFinishedEvents);
      sinon.stub(challengesRepository, 'sortChallenges').returns(sortedEvents);
    });

    it('calls wrappers with correct parameters', async () => {
      const result = await challengesRepository.ongoingChallenges();
      expect(configWrapperMock.challengeDuration).to.be.calledOnce;
      expect(challengeWrapperMock.earliestMeaningfulBlock).to.be.calledWith(challengeDuration);
      expect(challengeWrapperMock.challenges).to.be.calledWith(fromBlock);
      expect(challengeWrapperMock.resolvedChallenges).to.be.calledWith(fromBlock);
      expect(challengeWrapperMock.timedOutChallenges).to.be.calledWith(fromBlock);
      expect(result).to.deep.equal(sortedEvents);
    });

    it('calls own methods with correct params', async () => {
      await challengesRepository.ongoingChallenges();
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledThrice;
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledWith(events);
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledWith(resolvedEvents);
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledWith(timedOutEvents);
      expect(challengesRepository.filterOutFinishedChallenges).to.be.calledOnceWith(
        [
          {sheltererId, bundleId, challengeId, count, blockNumber: 4},
          {sheltererId, bundleId, challengeId: 100, count, blockNumber: 2}
        ],
        [{challengeId: 'resolved', blockNumber: 3, resolverId: 'someResolverId'}],
        [{challengeId: 'timedOut', blockNumber: 5}],
        challengeWrapperMock.defaultAddress
      );
      expect(challengesRepository.sortChallenges).to.be.calledWith(notFinishedEvents);
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
