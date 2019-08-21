/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import EventsCollector from './events_collector';

/** @abstract */
export default class ResolutionsRepository extends EventsCollector {
  constructor(blockchainStateWrapper, activeResolutionsCache, eventOneFetchLimit) {
    super(blockchainStateWrapper, eventOneFetchLimit);
    this.activeResolutionsCache = activeResolutionsCache;
  }

  async ongoingResolutions() {
    const {fromBlock, currentBlock} = await this.getBlockInfo();
    if (fromBlock <= currentBlock) {
      await this.updateActiveResolutionsCache(fromBlock, currentBlock);
      this.updateBlockInfo(currentBlock);
    }
    return this.activeResolutionsCache.activeResolutions;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getExpirationTimeInMs(resolution) {
    throw new Error('Should be implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolve(resolution) {
    throw new Error('Should be implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateActiveResolutionsCache(fromBlock, currentBlock) {
    throw new Error('Should be implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDesignatedShelterer(resolution) {
    throw new Error('Should be implemented');
  }
}
