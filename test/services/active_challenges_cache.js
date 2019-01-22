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

  describe('Add challenge', () => {
    beforeEach(() => {
      activeChallengesCache.add(exampleChallenge);
    });

    it('adds challenge', () => {
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
    });

    it('get added challenge', () => {
      expect(activeChallengesCache.get('0xc0ffee')).to.deep.equal({
        sheltererId: '0xbeef',
        bundleId: '0xdeadbeef',
        count: 12,
        blockNumber: 1,
        logIndex: 0
      });
    });

    it('does not overwrite challenges added previously', () => {
      activeChallengesCache.add([{
        challengeId: '0xc0ffee',
        sheltererId: '0xbeef',
        bundleId: '0xdeadbeef',
        count: 1239
      }]);
      expect(activeChallengesCache.get('0xc0ffee')).to.deep.equal({
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
      activeChallengesCache.expire({challengeId: '0xc0ffee'});
      expect(activeChallengesCache.has('0xc0ffee')).to.be.false;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
    });

    it('does not throw if tried to delete not existing challenge', () => {
      activeChallengesCache.expire({challengeId: '0xdeadface'});
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
    });
  });

  describe('Decrease active count', () => {
    beforeEach(() => {
      activeChallengesCache.add(exampleChallenge);
      activeChallengesCache.add(exampleChallenge2);
    });

    it('decreases active count for different challenges', () => {
      activeChallengesCache.decreaseActiveCount({challengeId: '0xc0ffee'});
      expect(activeChallengesCache.get('0xc0ffee')).to.deep.equal({
        sheltererId: '0xbeef',
        bundleId: '0xdeadbeef',
        count: 11,
        blockNumber: 1,
        logIndex: 0
      });
      expect(activeChallengesCache.get('0xc0ffee2')).to.deep.equal({
        sheltererId: '0xbeef2',
        bundleId: '0xdeadbeef2',
        count: 43,
        blockNumber: 2,
        logIndex: 1
      });
    });

    it('decreases active count for same challenge many times', () => {
      activeChallengesCache.decreaseActiveCount({challengeId: '0xc0ffee'});
      activeChallengesCache.decreaseActiveCount({challengeId: '0xc0ffee'});
      activeChallengesCache.decreaseActiveCount({challengeId: '0xc0ffee'});
      expect(activeChallengesCache.get('0xc0ffee')).to.deep.equal({
        sheltererId: '0xbeef',
        bundleId: '0xdeadbeef',
        count: 9,
        blockNumber: 1,
        logIndex: 0
      });
    });

    it('does not throw if tried to decreases active count of not existing challenge', () => {
      activeChallengesCache.decreaseActiveCount([{challengeId: '0xdeadface'}]);
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
    });

    it('removes challenge when active count falls to 0', () => {
      for (let ind = 0; ind < 12; ind++) {
        activeChallengesCache.decreaseActiveCount({challengeId: '0xc0ffee'});
      }
      expect(activeChallengesCache.has('0xc0ffee')).to.be.false;
    });
  });

  describe('Active challenges getter', () => {
    beforeEach(() => {
      activeChallengesCache.add(exampleChallenge);
      activeChallengesCache.add(exampleChallenge2);
      activeChallengesCache.add(exampleChallenge3);
    });

    it('returns all active challanges as an array', () => {
      expect(activeChallengesCache.activeChallenges).to.deep.equal([exampleChallenge, exampleChallenge3, exampleChallenge2]);
    });
  });

  describe('Sorts chronogically', () => {
    const events = [
      {blockNumber: 5, logIndex: 2},
      {blockNumber: 9, logIndex: 4},
      {blockNumber: 5, logIndex: 7}
    ];

    it('in increasing blockNumber and logIndex order', () => {
      expect(activeChallengesCache.sortChronologically(events)).to.deep.equal([{blockNumber: 5, logIndex: 2}, {blockNumber: 5, logIndex: 7}, {blockNumber: 9, logIndex: 4}]);
    });
  });

  describe('Applies multiple changes', () => {
    it('Applies in correct order', () => {
      activeChallengesCache.applyIncomingChallengeEvents([
        {...exampleChallenge, blockNumber: 1, count: 7},
        {...exampleChallenge2, blockNumber: 3, count: 16},
        {...exampleChallenge, blockNumber: 4, count: 12},
        {...exampleChallenge2, blockNumber: 1, count: 4}
      ], [
        {...exampleChallenge, blockNumber: 2},
        {...exampleChallenge2, blockNumber: 5},
        {...exampleChallenge2, blockNumber: 3},
        {...exampleChallenge, blockNumber: 3},
        {...exampleChallenge2, blockNumber: 2},
        {...exampleChallenge2, blockNumber: 4}
      ], [
        {...exampleChallenge, blockNumber: 0},
        {...exampleChallenge2, blockNumber: 2}
      ]);

      expect(activeChallengesCache.activeChallenges).to.deep.equal([
        {...exampleChallenge, count: 5, blockNumber: 1},
        {...exampleChallenge2, count: 13, blockNumber: 3}
      ]);
    });
  });
});
