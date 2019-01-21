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
  const exampleChallenges = [
    {
      challengeId: '0xc0ffee',
      sheltererId: '0xbeef',
      bundleId: '0xdeadbeef',
      count: 12
    },
    {
      challengeId: '0xc0ffee2',
      sheltererId: '0xbeef2',
      bundleId: '0xdeadbeef2',
      count: 42
    }
  ];

  beforeEach(() => {
    activeChallengesCache = new ActiveChallengesCache();
    activeChallengesCache.add(exampleChallenges);
  });

  describe('Add challenge', () => {
    it('adds challenge', () => {
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
      expect(activeChallengesCache.has('0xbullsh1t')).to.be.false;
    });

    it('get added challenge', () => {
      expect(activeChallengesCache.get('0xc0ffee')).to.deep.equal({
        sheltererId: '0xbeef',
        bundleId: '0xdeadbeef',
        count: 12
      });
      expect(activeChallengesCache.get('0xc0ffee2')).to.deep.equal({
        sheltererId: '0xbeef2',
        bundleId: '0xdeadbeef2',
        count: 42
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
        count: 12
      });
    });

    it('adds new challenges on top of existing ones', () => {
      activeChallengesCache.add([{
        challengeId: '0xadup',
        sheltererId: '0x123',
        bundleId: '0x54',
        count: 69
      }]);
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
      expect(activeChallengesCache.get('0xadup')).to.deep.equal({
        sheltererId: '0x123',
        bundleId: '0x54',
        count: 69
      });
    });
  });

  describe('Cleanup outdated challenges', () => {
    it('deletes challenge', () => {
      activeChallengesCache.expire([{challengeId: '0xc0ffee'}]);
      expect(activeChallengesCache.has('0xc0ffee')).to.be.false;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
    });

    it('deletes multiple challenges', () => {
      activeChallengesCache.expire([{challengeId: '0xc0ffee'}, {challengeId: '0xc0ffee2'}]);
      expect(activeChallengesCache.has('0xc0ffee')).to.be.false;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.false;
    });

    it('does not throw if tried to delete not existing challenge', () => {
      activeChallengesCache.expire([{challengeId: '0xdeadface'}]);
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
    });
  });

  describe('Decrease active count', () => {
    it('decreases active count for different challenges', () => {
      activeChallengesCache.decreaseActiveCount([{challengeId: '0xc0ffee'}, {challengeId: '0xc0ffee2'}]);
      expect(activeChallengesCache.get('0xc0ffee')).to.deep.equal({
        sheltererId: '0xbeef',
        bundleId: '0xdeadbeef',
        count: 11
      });
      expect(activeChallengesCache.get('0xc0ffee2')).to.deep.equal({
        sheltererId: '0xbeef2',
        bundleId: '0xdeadbeef2',
        count: 41
      });
    });

    it('decreases active count for same challenge many times', () => {
      activeChallengesCache.decreaseActiveCount([{challengeId: '0xc0ffee'}, {challengeId: '0xc0ffee'}, {challengeId: '0xc0ffee'}]);
      expect(activeChallengesCache.get('0xc0ffee')).to.deep.equal({
        sheltererId: '0xbeef',
        bundleId: '0xdeadbeef',
        count: 9
      });
    });

    it('does not throw if tried to decreases active count of not existing challenge', () => {
      activeChallengesCache.decreaseActiveCount([{challengeId: '0xdeadface'}]);
      expect(activeChallengesCache.has('0xc0ffee')).to.be.true;
      expect(activeChallengesCache.has('0xc0ffee2')).to.be.true;
    });

    it('removes challenge when active count falls to 0', () => {
      for (let ind = 0; ind < 12; ind++) {
        activeChallengesCache.decreaseActiveCount([{challengeId: '0xc0ffee'}]);
      }
      expect(activeChallengesCache.has('0xc0ffee')).to.be.false;
    });
  });

  describe('Active challenges getter', () => {
    it('returns all active challanges as an array', () => {
      expect(activeChallengesCache.activeChallenges).to.deep.equal(exampleChallenges);
    });
  });
});
