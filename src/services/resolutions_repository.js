/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/** @abstract */
export default class ResolutionsRepository {
  constructor(blockchainStateWrapper, activeResolutionsCache, eventOneFetchLimit) {
    this.blockchainStateWrapper = blockchainStateWrapper;
    this.activeResolutionsCache = activeResolutionsCache;
    this.eventOneFetchLimit = eventOneFetchLimit;
    this.lastSavedBlock = 0;
  }

  prepareResolutionEvent(resolutionEvents, outputFields) {
    return resolutionEvents.map(
      ({blockNumber, logIndex, returnValues}) => outputFields.reduce(
        (acc, fieldName) => {
          acc[fieldName] = returnValues[fieldName];
          return acc;
        },
        {blockNumber, logIndex}
      )
    );
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
  async updateActiveResolutionsCache(fromBlock, currentBlock) {
    throw new Error('Should be implemented');
  }

  async collectResolutionEvents(fromBlock, currentBlock, fetchEvents, outputFields) {
    return this.collectResolutionEventsWithStep(fromBlock, currentBlock, this.eventOneFetchLimit, fetchEvents, outputFields);
  }

  async collectResolutionEventsWithStep(fromBlock, currentBlock, step, fetchEvents, outputFields) {
    let collectedResolutionEvents = [];
    for (let startBlock = fromBlock; startBlock <= currentBlock; startBlock += step) {
      const endBlock = Math.min(currentBlock, startBlock + step - 1);
      const challengeBlockchainEvents = await fetchEvents(startBlock, endBlock);
      collectedResolutionEvents = collectedResolutionEvents.concat(this.prepareResolutionEvent(challengeBlockchainEvents, outputFields));
    }
    return collectedResolutionEvents;
  }

  async getBlockInfo() {
    const fromBlock = await this.getFromBlock();
    const currentBlock = await this.blockchainStateWrapper.getCurrentBlockNumber();
    return {fromBlock, currentBlock};
  }

  async getFromBlock() {
    throw new Error('Should be implemented');
  }

  updateBlockInfo(currentBlock) {
    this.lastSavedBlock = currentBlock;
  }
}
