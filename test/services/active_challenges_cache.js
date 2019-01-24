/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import ActiveChallengesCache from '../../src/services/active_challenges_cache';
import {expect} from 'chai';

describe('Active Challenges Cache', () => {
  let activeChallengesCache;
  const exampleChallenge = {
    challengeId: '0xc0ffee',
    sheltererId: '0xbeef',
    bundleId: '0xdeadbeef',
    count: 12,
    blockNumber: 1,
    logIndex: 0
  };
  const anotherChallengeId = {challengeId: 'anotherChallengeId'};

  beforeEach(() => {
    activeChallengesCache = new ActiveChallengesCache();
  });

  function aChallenge() {
    return exampleChallenge;
  }

  function aChallengeWith(params) {
    return {...aChallenge(), ...params};
  }

  describe('with one challenge added', () => {
    beforeEach(() => {
      activeChallengesCache.add(aChallenge());
    });

    it('has the challenge in active challenges', () => {
      expect(activeChallengesCache.activeChallenges).to.deep.include(aChallenge());
    });

    it('does not overwrite it with a challenge with same id', () => {
      activeChallengesCache.add(aChallengeWith({count: 2207}));

      expect(activeChallengesCache.activeChallenges).to.deep.include(aChallenge());
      expect(activeChallengesCache.activeChallenges).not.to.deep.include(aChallengeWith({count: 2207}));
    });

    it('stores another challenge alongside existing one', () => {
      activeChallengesCache.add(aChallengeWith(anotherChallengeId));

      expect(activeChallengesCache.activeChallenges).to.deep.include.members([
        aChallenge(),
        aChallengeWith(anotherChallengeId)
      ]);
    });
  });

  describe('when deleting', () => {
    beforeEach(() => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee'}));
      activeChallengesCache.add(aChallengeWith(anotherChallengeId));
    });

    it('deletes the right challenge', () => {
      activeChallengesCache.expire('0xc0ffee');

      expect(activeChallengesCache.activeChallenges).not.to.deep.include(aChallenge());
      expect(activeChallengesCache.activeChallenges).to.deep.include(aChallengeWith(anotherChallengeId));
    });

    it('does not throw if tried to delete not existing challenge', () => {
      activeChallengesCache.expire('0xdeadface');

      expect(activeChallengesCache.activeChallenges).to.deep.include.members([
        aChallenge(),
        aChallengeWith(anotherChallengeId)
      ]);
    });
  });

  describe('when decreasing active count', () => {
    it('reduces count for the right challenge', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', count: 12}));
      activeChallengesCache.add(aChallengeWith({challengeId: '0xbeef', count: 43}));

      activeChallengesCache.decreaseActiveCount('0xc0ffee');

      expect(activeChallengesCache.activeChallenges).to.deep.include.members([
        aChallengeWith({challengeId: '0xc0ffee', count: 11}),
        aChallengeWith({challengeId: '0xbeef', count: 43})
      ]);
    });

    it('reduces count for same challenge many times', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', count: 12}));

      activeChallengesCache.decreaseActiveCount('0xc0ffee');
      activeChallengesCache.decreaseActiveCount('0xc0ffee');
      activeChallengesCache.decreaseActiveCount('0xc0ffee');

      expect(activeChallengesCache.activeChallenges).to.deep.equal([aChallengeWith({challengeId: '0xc0ffee', count: 9})]);
    });

    it('does not throw if tried to decrease active count of not existing challenge', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee'}));

      activeChallengesCache.decreaseActiveCount([{challengeId: '0xdeadface'}]);
      expect(activeChallengesCache.activeChallenges).to.deep.include(aChallengeWith({challengeId: '0xc0ffee'}));
    });

    it('removes challenge when active count falls down to 0', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', count: 1}));

      activeChallengesCache.decreaseActiveCount('0xc0ffee');

      expect(activeChallengesCache.activeChallenges).not.to.deep.include(aChallengeWith({challengeId: '0xc0ffee'}));
    });
  });

  it('returns active challenges as a sorted array', () => {
    activeChallengesCache.add(aChallengeWith({challengeId: '0xbaddad', blockNumber: 4}));
    activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', blockNumber: 1}));
    activeChallengesCache.add(aChallengeWith({challengeId: '0xbeef', blockNumber: 3}));
    activeChallengesCache.add(aChallengeWith({challengeId: '0xdeadface', blockNumber: 2, logIndex: 1}));
    activeChallengesCache.add(aChallengeWith({challengeId: '0xcafebabe', blockNumber: 2, logIndex: 0}));

    expect(activeChallengesCache.activeChallenges).to.deep.equal([
      aChallengeWith({challengeId: '0xc0ffee', blockNumber: 1}),
      aChallengeWith({challengeId: '0xcafebabe', blockNumber: 2, logIndex: 0}),
      aChallengeWith({challengeId: '0xdeadface', blockNumber: 2, logIndex: 1}),
      aChallengeWith({challengeId: '0xbeef', blockNumber: 3}),
      aChallengeWith({challengeId: '0xbaddad', blockNumber: 4})
    ]);
  });

  describe('applies multiple changes', () => {
    it('adding started challenges', () => {
      activeChallengesCache.applyIncomingChallengeEvents([aChallenge()], [], []);

      expect(activeChallengesCache.activeChallenges).to.deep.eq([aChallenge()]);
    });


    it('removing timed out challenges', () => {
      activeChallengesCache.applyIncomingChallengeEvents([aChallengeWith({blockNumber: 1})], [], [aChallengeWith({blockNumber: 2})]);

      expect(activeChallengesCache.activeChallenges).to.be.empty;
    });

    it('reducing count for resolved challenges', () => {
      activeChallengesCache.applyIncomingChallengeEvents([aChallengeWith({blockNumber: 1, count: 5})], [aChallengeWith({blockNumber: 2})], []);

      expect(activeChallengesCache.activeChallenges).to.deep.eq([aChallengeWith({blockNumber: 1, count: 4})]);
    });

    it('respecting events order', () => {
      activeChallengesCache.applyIncomingChallengeEvents([aChallengeWith({blockNumber: 2})], [], [aChallengeWith({blockNumber: 1})]);

      expect(activeChallengesCache.activeChallenges).to.deep.eq([aChallengeWith({blockNumber: 2})]);
    });

    it('applying multiple changes to one challenge', () => {
      activeChallengesCache.applyIncomingChallengeEvents(
        [aChallengeWith({blockNumber: 1, count: 5})],
        [aChallengeWith({blockNumber: 3}), aChallengeWith({blockNumber: 2})],
        []
      );

      expect(activeChallengesCache.activeChallenges).to.deep.eq([aChallengeWith({blockNumber: 1, count: 3})]);
    });

    it('applying changes to different challenges', () => {
      activeChallengesCache.applyIncomingChallengeEvents(
        [aChallengeWith({challengeId: '1', blockNumber: 1, count: 5}), aChallengeWith({challengeId: '2', blockNumber: 1, count: 3})],
        [aChallengeWith({challengeId: '2', blockNumber: 3})],
        [aChallengeWith({challengeId: '1', blockNumber: 10})]
      );

      expect(activeChallengesCache.activeChallenges).to.deep.eq([aChallengeWith({challengeId: '2', blockNumber: 1, count: 2})]);
    });
  });
});
