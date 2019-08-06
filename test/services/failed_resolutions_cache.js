/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import FailedResolutionsCache from '../../src/services/failed_resolutions_cache';
import sinon from 'sinon';

const {expect} = chai;

describe('Failed resolutions cache', () => {
  let failedResolutionsCache;
  let clock;
  const ttl = 5;
  const now = 15000000;
  const resolutionId1 = 'cid1';
  const resolutionId2 = 'cid2';

  beforeEach(() => {
    clock = sinon.useFakeTimers(now * 1000);
    failedResolutionsCache = new FailedResolutionsCache();
  });

  afterEach(() => {
    clock.restore();
  });

  it('failed resolutions list should be empty at the beginning', () => {
    expect(failedResolutionsCache.failedResolutionsEndTime).to.deep.equal({});
  });

  it('rememberFailedResolution should set current timestamp to resolutionId', () => {
    failedResolutionsCache.rememberFailedResolution(resolutionId1, ttl);
    clock.tick(3000);
    failedResolutionsCache.rememberFailedResolution(resolutionId2, ttl);
    expect(failedResolutionsCache.failedResolutionsEndTime).to.deep.equal({
      [resolutionId1]: now + ttl,
      [resolutionId2]: now + ttl + 3
    });
  });

  describe('didResolutionFailRecently', () => {
    it('returns false when resolution is not saved as failed', () => {
      expect(failedResolutionsCache.didResolutionFailRecently(resolutionId1)).to.be.false;
    });

    it('returns true when resolution has been saved as failed and ttl has not passed', async () => {
      failedResolutionsCache.rememberFailedResolution(resolutionId1, ttl);
      expect(failedResolutionsCache.didResolutionFailRecently(resolutionId1)).to.be.true;
    });

    it('returns false when resolution has been saved as failed but ttl has passed', async () => {
      failedResolutionsCache.rememberFailedResolution(resolutionId1, ttl);
      clock.tick(ttl * 1000);
      expect(failedResolutionsCache.didResolutionFailRecently(resolutionId1)).to.be.false;
    });

    it('removes resolution from cache when ttl has passed', async () => {
      failedResolutionsCache.rememberFailedResolution(resolutionId1, ttl);
      clock.tick(ttl * 1000);
      failedResolutionsCache.didResolutionFailRecently(resolutionId1);
      expect(failedResolutionsCache.failedResolutionsEndTime).to.deep.equal({});
    });
  });

  it('clearOutdatedResolutions removes all outdated resolutions', async () => {
    failedResolutionsCache.rememberFailedResolution(resolutionId1, ttl);
    failedResolutionsCache.rememberFailedResolution(resolutionId2, ttl + 1);
    clock.tick(ttl * 1000);
    failedResolutionsCache.clearOutdatedResolutions();
    expect(failedResolutionsCache.failedResolutionsEndTime).to.deep.equal({
      [resolutionId2]: now + ttl + 1
    });
  });
});
