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

  describe('Add challenge', () => {
    beforeEach(() => {
      activeChallengesCache.add(aChallenge());
    });

    it('adds challenge', () => {
      expect(activeChallengesCache.activeChallenges).to.deep.include(aChallenge());
    });

    it('does not overwrite challenges added previously', () => {
      activeChallengesCache.add(aChallengeWith({count: 2207}));
      expect(activeChallengesCache.activeChallenges).to.deep.include(aChallenge());
      expect(activeChallengesCache.activeChallenges).not.to.deep.include(aChallengeWith({count: 2207}));
    });

    it('adds new challenges on top of existing ones', () => {
      activeChallengesCache.add(aChallengeWith(anotherChallengeId));
      expect(activeChallengesCache.activeChallenges).to.deep.include.members([
        aChallenge(),
        aChallengeWith(anotherChallengeId)
      ]);
    });
  });

  describe('Cleanup outdated challenges', () => {
    beforeEach(() => {
      activeChallengesCache.add(aChallenge());
      activeChallengesCache.add(aChallengeWith(anotherChallengeId));
    });

    it('deletes challenge', () => {
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

  describe('can decrease active count', () => {
    it('for the right challenge', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', count: 12}));
      activeChallengesCache.add(aChallengeWith({challengeId: '0xbeef', count: 43}));

      activeChallengesCache.decreaseActiveCount('0xc0ffee');

      expect(activeChallengesCache.activeChallenges).to.deep.include.members([
        aChallengeWith({challengeId: '0xc0ffee', count: 11}),
        aChallengeWith({challengeId: '0xbeef', count: 43})
      ]);
    });

    it('for same challenge many times', () => {
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

    it('removes challenge when active count falls to 0', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', count: 1}));

      activeChallengesCache.decreaseActiveCount('0xc0ffee');

      expect(activeChallengesCache.activeChallenges).not.to.deep.include(aChallengeWith({challengeId: '0xc0ffee'}));
    });
  });

  describe('stores active challenges', () => {
    beforeEach(() => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xbaddad', blockNumber: 4}));
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', blockNumber: 1}));
      activeChallengesCache.add(aChallengeWith({challengeId: '0xbeef', blockNumber: 3}));
      activeChallengesCache.add(aChallengeWith({challengeId: '0xdeadface', blockNumber: 2}));
    });

    it('returns all active challenges as an array', () => {
      expect(activeChallengesCache.activeChallenges).to.deep.equal([
        aChallengeWith({challengeId: '0xc0ffee', blockNumber: 1}),
        aChallengeWith({challengeId: '0xdeadface', blockNumber: 2}),
        aChallengeWith({challengeId: '0xbeef', blockNumber: 3}),
        aChallengeWith({challengeId: '0xbaddad', blockNumber: 4})
      ]);
    });
  });

  describe('sorts chronologically', () => {
    const events = [
      {blockNumber: 5, logIndex: 2},
      {blockNumber: 9, logIndex: 4},
      {blockNumber: 5, logIndex: 7}
    ];

    it('in increasing blockNumber and logIndex order', () => {
      expect(activeChallengesCache.sortChronologically(events)).to.deep.equal([
        {blockNumber: 5, logIndex: 2},
        {blockNumber: 5, logIndex: 7},
        {blockNumber: 9, logIndex: 4}
      ]);
    });
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
