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
  const exampleChallenge2 = {
    challengeId: '0xc0ffee2',
    sheltererId: '0xbeef2',
    bundleId: '0xdeadbeef2',
    count: 43,
    blockNumber: 2,
    logIndex: 1
  };
  const exampleChallenge3 = {
    challengeId: '0xc0ffee3',
    sheltererId: '0xbeef3',
    bundleId: '0xdeadbeef3',
    count: 17,
    blockNumber: 1,
    logIndex: 2
  };

  beforeEach(() => {
    activeChallengesCache = new ActiveChallengesCache();
  });

  function aChallenge() {
    return {
      challengeId: '0xc0ffee',
      sheltererId: '0xbeef',
      bundleId: '0xdeadbeef',
      count: 12,
      blockNumber: 1,
      logIndex: 0
    };
  }

  function aChallengeWith(params) {
    return {...aChallenge(), ...params};
  }

  describe('Add challenge', () => {
    beforeEach(() => {
      activeChallengesCache.add(exampleChallenge);
    });

    it('adds challenge', () => {
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
    });

    it('get added challenge', () => {
      expect(activeChallengesCache.get('0xc0ffee')).to.deep.equal(exampleChallenge);
    });

    it('does not overwrite challenges added previously', () => {
      activeChallengesCache.add([{
        challengeId: '0xc0ffee',
        sheltererId: '0xbeef',
        bundleId: '0xdeadbeef',
        count: 1239
      }]);
      expect(activeChallengesCache.get('0xc0ffee')).to.deep.equal({
        challengeId: '0xc0ffee',
        sheltererId: '0xbeef',
        bundleId: '0xdeadbeef',
        count: 12,
        blockNumber: 1,
        logIndex: 0
      });
    });

    it('adds new challenges on top of existing ones', () => {
      activeChallengesCache.add({
        challengeId: '0xc0ffeedad',
        sheltererId: '0x123',
        bundleId: '0x54',
        count: 69
      });
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
      expect(activeChallengesCache.get('0xc0ffeedad')).to.deep.equal({
        challengeId: '0xc0ffeedad',
        sheltererId: '0x123',
        bundleId: '0x54',
        count: 69
      });
    });
  });

  describe('Cleanup outdated challenges', () => {
    beforeEach(() => {
      activeChallengesCache.add(exampleChallenge);
      activeChallengesCache.add(exampleChallenge2);
    });

    it('deletes challenge', () => {
      activeChallengesCache.expire('0xc0ffee');
      expect(activeChallengesCache.has('0xc0ffee')).to.be.false;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
    });

    it('does not throw if tried to delete not existing challenge', () => {
      activeChallengesCache.expire('0xdeadface');
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
    });
  });

  describe('can decrease active count', () => {
    it('for the right challenge', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', count: 12}));
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee2', count: 43}));

      activeChallengesCache.decreaseActiveCount('0xc0ffee');

      expect(activeChallengesCache.activeChallenges).to.deep.include.members([
        aChallengeWith({challengeId: '0xc0ffee', count: 11}),
        aChallengeWith({challengeId: '0xc0ffee2', count: 43})
      ]);
    });

    it('for same challenge many times', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', count: 12}));

      activeChallengesCache.decreaseActiveCount('0xc0ffee');
      activeChallengesCache.decreaseActiveCount('0xc0ffee');
      activeChallengesCache.decreaseActiveCount('0xc0ffee');

      expect(activeChallengesCache.activeChallenges).to.deep.eq([aChallengeWith({challengeId: '0xc0ffee', count: 9})]);
    });

    it('does not throw if tried to decrease active count of not existing challenge', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee'}));

      activeChallengesCache.decreaseActiveCount([{challengeId: '0xdeadface'}]);
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
    });

    it('removes challenge when active count falls to 0', () => {
      activeChallengesCache.add(aChallengeWith({challengeId: '0xc0ffee', count: 1}));

      activeChallengesCache.decreaseActiveCount('0xc0ffee');

      expect(activeChallengesCache.has('0xc0ffee')).to.be.false;
    });
  });

  describe('stores active challenges', () => {
    beforeEach(() => {
      activeChallengesCache.add(exampleChallenge);
      activeChallengesCache.add(exampleChallenge2);
      activeChallengesCache.add(exampleChallenge3);
    });

    it('returns all active challanges as an array', () => {
      expect(activeChallengesCache.activeChallenges).to.deep.equal([exampleChallenge, exampleChallenge3, exampleChallenge2]);
    });
  });

  describe('sorts chronogically', () => {
    const events = [
      {blockNumber: 5, logIndex: 2},
      {blockNumber: 9, logIndex: 4},
      {blockNumber: 5, logIndex: 7}
    ];

    it('in increasing blockNumber and logIndex order', () => {
      expect(activeChallengesCache.sortChronologically(events)).to.deep.equal([{blockNumber: 5, logIndex: 2}, {blockNumber: 5, logIndex: 7}, {
        blockNumber: 9,
        logIndex: 4
      }]);
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

      expect(activeChallengesCache.activeChallenges).to.deep.eq([aChallengeWith({blockNumber: 1, count: 4})]); // is it ok that the blockNumber is 1 not 2?
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
