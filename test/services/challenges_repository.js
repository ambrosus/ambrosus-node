/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import ChallengesRepository from '../../src/services/challenges_repository';
import sinon from 'sinon';

chai.use(sinonChai);
const {expect} = chai;

describe('Challenges repository', () => {
  let challengeWrapperMock;
  let configWrapperMock;
  let challengesRepository;

  describe('resolvableChallenges', () => {
    const sheltererId = 1;
    const bundleId = 2;
    const challengeId = 3;
    const fromBlock = 4;
    const challengeDuration = 5;
    const events = [
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId
        }
      },
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId: 100
        }
      },
      {
        returnValues: {
          sheltererId,
          bundleId,
          challengeId
        }
      }];

    beforeEach(() => {
      challengeWrapperMock = {
        previousChallenges: sinon.stub().resolves(events),
        earliestMeaningfulBlock: sinon.stub().resolves(fromBlock),
        canResolve: sinon.stub()
      };

      configWrapperMock = {
        challengeDuration: sinon.stub().resolves(challengeDuration)
      };

      challengeWrapperMock.canResolve.resolves(new Promise((resolve) => resolve(false)));
      challengeWrapperMock.canResolve.withArgs(challengeId).resolves(new Promise((resolve) => resolve(true)));
      challengesRepository = new ChallengesRepository(challengeWrapperMock, configWrapperMock);
    });

    it('calls wrappers with correct parameters', async () => {
      const result = await challengesRepository.resolvableChallenges();
      expect(configWrapperMock.challengeDuration).to.be.calledOnce;
      expect(challengeWrapperMock.earliestMeaningfulBlock).to.be.calledWith(challengeDuration);
      expect(challengeWrapperMock.previousChallenges).to.be.calledWith(fromBlock);
      expect(challengeWrapperMock.canResolve).to.be.calledThrice;
      expect(result).to.deep.equal(Array(2).fill({sheltererId, bundleId, challengeId}));
    });
  });

  describe('resolveChallenge', () => {
    const challengeId = '0x123';

    beforeEach(() => {
      challengeWrapperMock = {
        resolve: sinon.stub()
      };
      challengesRepository = new ChallengesRepository(challengeWrapperMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengesRepository.resolveChallenge(challengeId);
      expect(challengeWrapperMock.resolve).to.be.calledOnceWith(challengeId);
    });
  });
});
