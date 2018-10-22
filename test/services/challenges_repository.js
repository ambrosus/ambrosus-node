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

  describe('filterOutFinished', () => {
    beforeEach(() => {
      challengesRepository = new ChallengesRepository();
    });

    describe('Single challenges', () => {
      const allChallenges = [
        {challengeId: '1', count: 1},
        {challengeId: '2', count: 1},
        {challengeId: '3', count: 1},
        {challengeId: '4', count: 1},
        {challengeId: '5', count: 1},
        {challengeId: '6', count: 1},
        {challengeId: '7', count: 1}
      ];
      const resolvedChallenges = [
        {challengeId: '1'},
        {challengeId: '100'},
        {challengeId: '6'}
      ];
      const timedOutChallenges = [
        {challengeId: '0'},
        {challengeId: '2'},
        {challengeId: '3'},
        {challengeId: '-1'},
        {challengeId: '7'},
        {challengeId: '7'}
      ];

      it('should remove single challenges that are resolved or timed out', async () => {
        expect(challengesRepository.filterOutFinished(allChallenges, resolvedChallenges, timedOutChallenges)).to.deep.equal([
          {challengeId: '4', count: 1},
          {challengeId: '5', count: 1}
        ]);
      });
    });

    describe('Multiple challenges', () => {
      const allChallenges = [
        {challengeId: '1', count: 2},
        {challengeId: '2', count: 1},
        {challengeId: '3', count: 4}
      ];
      const resolvedChallenges = [
        {challengeId: '1'},
        {challengeId: '1'},
        {challengeId: '2'},
        {challengeId: '3'},
        {challengeId: '3'}
      ];
      const timedOutChallenges = [{challengeId: '3'}];

      it('should remove challenges only if resolution count is not less then creation count', async () => {
        expect(challengesRepository.filterOutFinished(allChallenges, resolvedChallenges, [])).to.deep.equal([
          {challengeId: '3', count: 4}
        ]);
      });

      it('should remove challenge when timed out', async () => {
        expect(challengesRepository.filterOutFinished(allChallenges, [], timedOutChallenges)).to.deep.equal([
          {challengeId: '1', count: 2},
          {challengeId: '2', count: 1}
        ]);
      });

      it('timed out and resolved work together', async () => {
        expect(challengesRepository.filterOutFinished(allChallenges, resolvedChallenges, timedOutChallenges)).to.deep.equal([]);
      });
    });
  });

  describe('filterOutNotResolvableChallenges', () => {
    const allChallenges = [
      {challengeId: '1', bundleId: '0x123'},
      {challengeId: '2', bundleId: '0xabc'},
      {challengeId: '3', bundleId: '0x123'},
      {challengeId: '4', bundleId: '0xabc'},
      {challengeId: '5', bundleId: '0x123'},
      {challengeId: '6', bundleId: '0xc0ffee'},
      {challengeId: '7', bundleId: '0x123'}
    ];

    beforeEach(() => {
      challengeWrapperMock = {
        canResolve: sinon.stub().resolves(false)
      };
      challengesRepository = new ChallengesRepository(challengeWrapperMock);
    });

    it('should return only challenges that are resolvable on blockchain', async () => {
      challengeWrapperMock.canResolve.resolves(true)
        .withArgs('1')
        .resolves(false)
        .withArgs('2')
        .resolves(false)
        .withArgs('3')
        .resolves(false);

      expect(await challengesRepository.filterOutNotResolvableChallenges(allChallenges)).to.deep.equal([
        {challengeId: '4', bundleId: '0xabc'},
        {challengeId: '5', bundleId: '0x123'},
        {challengeId: '6', bundleId: '0xc0ffee'},
        {challengeId: '7', bundleId: '0x123'}
      ]);
      expect(challengeWrapperMock.canResolve).to.have.callCount(7);
      allChallenges.forEach(({challengeId}) => expect(challengeWrapperMock.canResolve).to.be.calledWith(challengeId));
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
        }
      },
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId: 100,
          count
        }
      },
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId,
          count
        }
      }];
    const challenges = [
      {sheltererId, bundleId, challengeId, count},
      {sheltererId, bundleId, challengeId: 100, count},
      {sheltererId, bundleId, challengeId, count}];

    beforeEach(() => {
      challengesRepository = new ChallengesRepository();
    });

    it('extracts fields specified in selector from events list', async () => {
      expect(challengesRepository.extractChallengeFromEvent(events, ['challengeId', 'sheltererId', 'bundleId', 'count'])).to.deep.equal(challenges);
      expect(challengesRepository.extractChallengeFromEvent(events, ['challengeId'])).to.deep.equal([{challengeId}, {challengeId: 100}, {challengeId}]);
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
        returnValues: {
          sheltererId,
          bundleId,
          challengeId,
          count
        }
      },
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId: 100,
          count
        }
      }];
    const resolvedEvents = [{returnValues: {bundleId, sheltererId, challengeId: 'resolved'}}];
    const timedOutEvents = [{returnValues: {bundleId, sheltererId, challengeId: 'timedOut'}}];
    const notFinishedEvents = 'notFinishedEvents';
    const resolvableEvents = 'resolvableEvents';

    beforeEach(() => {
      challengeWrapperMock = {
        challenges: sinon.stub().resolves(events),
        resolvedChallenges: sinon.stub().resolves(resolvedEvents),
        timedOutChallenges: sinon.stub().resolves(timedOutEvents),
        earliestMeaningfulBlock: sinon.stub().resolves(fromBlock)
      };
      configWrapperMock = {
        challengeDuration: sinon.stub().resolves(challengeDuration)
      };
      challengesRepository = new ChallengesRepository(challengeWrapperMock, configWrapperMock);
      sinon.spy(challengesRepository, 'extractChallengeFromEvent');
      sinon.stub(challengesRepository, 'filterOutFinished').returns(notFinishedEvents);
      sinon.stub(challengesRepository, 'filterOutNotResolvableChallenges').resolves(resolvableEvents);
    });

    it('calls wrappers with correct parameters', async () => {
      const result = await challengesRepository.ongoingChallenges();
      expect(configWrapperMock.challengeDuration).to.be.calledOnce;
      expect(challengeWrapperMock.earliestMeaningfulBlock).to.be.calledWith(challengeDuration);
      expect(challengeWrapperMock.challenges).to.be.calledWith(fromBlock);
      expect(challengeWrapperMock.resolvedChallenges).to.be.calledWith(fromBlock);
      expect(challengeWrapperMock.timedOutChallenges).to.be.calledWith(fromBlock);
      expect(result).to.deep.equal(resolvableEvents);
    });

    it('calls own methods with correct params', async () => {
      await challengesRepository.ongoingChallenges();
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledThrice;
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledWith(events);
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledWith(resolvedEvents);
      expect(challengesRepository.extractChallengeFromEvent).to.be.calledWith(timedOutEvents);
      expect(challengesRepository.filterOutFinished).to.be.calledOnceWith(
        [{sheltererId, bundleId, challengeId, count},
          {sheltererId, bundleId, challengeId: 100, count}],
        [{challengeId: 'resolved'}],
        [{challengeId: 'timedOut'}]);
      expect(challengesRepository.filterOutNotResolvableChallenges).to.be.calledOnceWith(notFinishedEvents);
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
