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
import ChallengesWrapper from '../../../src/services/contract_wrappers/challenges_wrapper';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Challenges Wrapper', () => {
  let contractManagerMock;
  let challengesWrapper;

  describe('earliestMeaningfulBlock', () => {
    const blockNumber = 1752205;
    const challengeDuration = 4 * 24 * 60 * 60;

    beforeEach(async () => {
      contractManagerMock = {
        web3: {
          eth: {
            getBlockNumber: sinon.stub().resolves(blockNumber)
          }
        }
      };
      challengesWrapper = new ChallengesWrapper(contractManagerMock);
    });

    it('computes earliest block', async () => {
      expect(await challengesWrapper.earliestMeaningfulBlock(challengeDuration)).to.equal(1683085); // 1752205 - 4 * 24 * 60 * 60 / 5
    });

    it('returns 0 when block count is too small for any challenge to expire', async () => {
      contractManagerMock.web3.eth.getBlockNumber.resolves(10);
      expect(await challengesWrapper.earliestMeaningfulBlock(challengeDuration)).to.equal(0);
    });
  });

  describe('previousChallenges', () => {
    const fromBlock = 4;
    const eventsStub = 'events';
    let getPastEventsStub;

    beforeEach(async () => {
      contractManagerMock = {
        challengesContract: async () => ({
          getPastEvents: getPastEventsStub
        })
      };
      getPastEventsStub = sinon.stub().resolves(eventsStub);
      challengesWrapper = new ChallengesWrapper(contractManagerMock);
    });

    it('gets past events', async () => {
      expect(await challengesWrapper.previousChallenges(fromBlock)).to.equal(eventsStub);
      expect(getPastEventsStub).to.be.calledWith('ChallengeCreated', {fromBlock});
    });
  });

  describe('resolve', () => {
    const challengeId = '0x123';
    const defaultAccount = '0x123';
    const resolveChallengeStub = sinon.stub();
    const resolveChallengeSendStub = sinon.stub();

    beforeEach(async () => {
      contractManagerMock = {
        challengesContract: async () => ({
          methods: {
            resolve: resolveChallengeStub
          }
        }),
        web3: {
          eth: {
            defaultAccount
          }
        }
      };
      resolveChallengeStub.returns({
        send: resolveChallengeSendStub
      });
      challengesWrapper = new ChallengesWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      await challengesWrapper.resolve(challengeId);
      expect(resolveChallengeStub).to.be.calledWith(challengeId);
      expect(resolveChallengeSendStub).to.be.calledWith({from: defaultAccount});
    });
  });

  describe('canResolve', () => {
    const challengeId = '0x123';
    const defaultAccount = '0x123';
    const result = 'res';
    const canResolveStub = sinon.stub();
    const canResolveCallStub = sinon.stub().resolves(result);

    beforeEach(async () => {
      contractManagerMock = {
        challengesContract: async () => ({
          methods: {
            canResolve: canResolveStub
          }
        }),
        web3: {
          eth: {
            defaultAccount
          }
        }
      };
      canResolveStub.returns({
        call: canResolveCallStub
      });
      challengesWrapper = new ChallengesWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengesWrapper.canResolve(challengeId)).to.equal(result);
      expect(canResolveStub).to.be.calledWith(defaultAccount, challengeId);
      expect(canResolveCallStub).to.be.called;
    });
  });

  describe('isInProgress', () => {
    const challengeId = '0x123';
    const result = 'res';
    const challengeIsInProgressStub = sinon.stub();
    const challengeIsInProgressCallStub = sinon.stub().resolves(result);

    beforeEach(async () => {
      contractManagerMock = {
        challengesContract: async () => ({
          methods: {
            challengeIsInProgress: challengeIsInProgressStub
          }
        })
      };
      challengeIsInProgressStub.returns({
        call: challengeIsInProgressCallStub
      });
      challengesWrapper = new ChallengesWrapper(contractManagerMock);
    });

    it('calls contract method with correct arguments', async () => {
      expect(await challengesWrapper.isInProgress(challengeId)).to.equal(result);
      expect(challengeIsInProgressStub).to.be.calledWith(challengeId);
      expect(challengeIsInProgressCallStub).to.be.called;
    });
  });
});
