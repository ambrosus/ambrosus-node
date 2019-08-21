/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/** @abstract */
export default class EventsCollector {
  constructor(blockchainStateWrapper, eventOneFetchLimit) {
    this.blockchainStateWrapper = blockchainStateWrapper;
    this.eventOneFetchLimit = eventOneFetchLimit;
    this.lastSavedBlock = 0;
  }

  prepareEvents(events, outputFields) {
    return events.map(
      ({blockNumber, logIndex, returnValues}) => outputFields.reduce(
        (acc, fieldName) => {
          acc[fieldName] = returnValues[fieldName];
          return acc;
        },
        {blockNumber, logIndex}
      )
    );
  }

  async collectEvents(fromBlock, currentBlock, fetchEvents, outputFields) {
    return this.collectEventsWithStep(fromBlock, currentBlock, this.eventOneFetchLimit, fetchEvents, outputFields);
  }

  async collectEventsWithStep(fromBlock, currentBlock, step, fetchEvents, outputFields) {
    let collectedEvents = [];
    for (let startBlock = fromBlock; startBlock <= currentBlock; startBlock += step) {
      const endBlock = Math.min(currentBlock, startBlock + step - 1);
      const blockchainEvents = await fetchEvents(startBlock, endBlock);
      collectedEvents = collectedEvents.concat(this.prepareEvents(blockchainEvents, outputFields));
    }
    return collectedEvents;
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
