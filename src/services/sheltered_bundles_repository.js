/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ResolutionsRepository from './resolutions_repository';

const SHELTERING_EVENT_ONE_FETCH_LIMIT = 250;

export default class ShelteredBundlesRepository extends ResolutionsRepository {
  constructor(address, bandleStoreWrapper, blockchainStateWrapper, activeBundlesCache, db) {
    super(blockchainStateWrapper, activeBundlesCache, SHELTERING_EVENT_ONE_FETCH_LIMIT);
    this.address = address;
    this.bandleStoreWrapper = bandleStoreWrapper;
    this.db = db;
  }

  async load() {
    try {
      const stored = await this.db.collection('resolutions_repository').findOne({name:'shelteredbundles'}, {projection: {_id: 0}});
      if (stored !== null) {
        this.lastSavedBlock = stored.lastSavedBlock;
        this.activeResolutionsCache.setActiveResolutions(stored.activeResolutions);
      }
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-empty
    }
  }

  async save() {
    try {
      await this.db.collection('resolutions_repository').updateOne({name:'shelteredbundles'}, {$set : {name:'shelteredbundles', lastSavedBlock: this.lastSavedBlock, activeResolutions: this.activeResolutionsCache.activeResolutions}}, {upsert : true});
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-empty
    }
  }

  async updateActiveResolutionsCache(fromBlock, currentBlock) {
    const addedBundles = await this.collectEvents(fromBlock, currentBlock,
      async (start, end) => (await this.bandleStoreWrapper.sheltererAdded(start, end)).filter((event) => event.returnValues.shelterer === this.address),
      ['bundleId', 'shelterer']);
    const removedBundles = await this.collectEvents(fromBlock, currentBlock,
      async (start, end) => (await this.bandleStoreWrapper.sheltererRemoved(start, end)).filter((event) => event.returnValues.shelterer === this.address),
      ['bundleId', 'shelterer']);

    this.activeResolutionsCache.applyIncomingResolutionEvents(addedBundles, [], removedBundles);
  }

  async getFromBlock() {
    if (this.lastSavedBlock > 0) {
      return this.lastSavedBlock + 1;
    }
    return 0;
  }
}
