/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import FailedChallengesCache from '../../src/services/failed_challenges_cache';
import sinon from 'sinon';

const {expect} = chai;

describe('Failed challenges cache', () => {
  let failedChallengesCache;
  let clock;
  const ttl = 5;
  const now = 15000000;
  const challengeId1 = 'cid1';
  const challengeId2 = 'cid2';

  beforeEach(() => {
    clock = sinon.useFakeTimers(now * 1000);
    failedChallengesCache = new FailedChallengesCache();
  });

  afterEach(() => {
    clock.restore();
  });

  it('failed challenges list should be empty at the beginning', () => {
    expect(failedChallengesCache.failedChallengesEndTime).to.deep.equal({});
  });

  it('rememberFailedChallenge should set current timestamp to challengeId', () => {
    failedChallengesCache.rememberFailedChallenge(challengeId1, ttl);
    clock.tick(3000);
    failedChallengesCache.rememberFailedChallenge(challengeId2, ttl);
    expect(failedChallengesCache.failedChallengesEndTime).to.deep.equal({
      [challengeId1]: now + ttl,
      [challengeId2]: now + ttl + 3
    });
  });

  it('didChallengeFailRecently returns false when challenge is not saved as failed', () => {
    expect(failedChallengesCache.didChallengeFailRecently(challengeId1)).to.be.false;
  });

  it('didChallengeFailRecently returns true when challenge has been saved as failed and ttl has not passed', async () => {
    failedChallengesCache.rememberFailedChallenge(challengeId1, ttl);
    expect(failedChallengesCache.didChallengeFailRecently(challengeId1)).to.be.true;
  });

  it('didChallengeFailRecently returns false when challenge has been saved as failed but ttl has passed', async () => {
    failedChallengesCache.rememberFailedChallenge(challengeId1, ttl);
    clock.tick(ttl * 1000);
    expect(failedChallengesCache.didChallengeFailRecently(challengeId1)).to.be.false;
  });

  it('didChallengeFailRecently removes challenge from cache when ttl has passed', async () => {
    failedChallengesCache.rememberFailedChallenge(challengeId1, ttl);
    clock.tick(ttl * 1000);
    failedChallengesCache.didChallengeFailRecently(challengeId1);
    expect(failedChallengesCache.failedChallengesEndTime).to.deep.equal({});
  });
});
