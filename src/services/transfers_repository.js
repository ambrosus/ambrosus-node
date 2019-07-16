/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ResolutionsRepository from './resolutions_repository';

const TRANSFER_EVENT_ONE_FETCH_LIMIT = 5000;

export default class TransfersRepository extends ResolutionsRepository {
  constructor(shelteringTransfersWrapper, transfersEventEmitterWrapper, configWrapper, blockchainStateWrapper, activeTransfersCache) {
    super(blockchainStateWrapper, activeTransfersCache, TRANSFER_EVENT_ONE_FETCH_LIMIT);
    this.shelteringTransfersWrapper = shelteringTransfersWrapper;
    this.transfersEventEmitterWrapper = transfersEventEmitterWrapper;
    this.configWrapper = configWrapper;
  }

  async updateActiveResolutionsCache(fromBlock, currentBlock) {
    const startedTransfers = await this.collectResolutionEvents(fromBlock, currentBlock,
      (start, end) => this.transfersEventEmitterWrapper.transfers(start, end),
      ['transferId', 'donorId', 'bundleId']);
    const resolvedTransfers = await this.collectResolutionEvents(fromBlock, currentBlock,
      (start, end) => this.transfersEventEmitterWrapper.resolvedTransfers(start, end),
      ['transferId']);
    const cancelledTransfers = await this.collectResolutionEvents(fromBlock, currentBlock,
      (start, end) => this.transfersEventEmitterWrapper.cancelledTransfers(start, end),
      ['transferId']);
    this.activeResolutionsCache.applyIncomingResolutionEvents(startedTransfers, resolvedTransfers, cancelledTransfers);
  }

  async getFromBlock() {
    if (this.lastSavedBlock > 0) {
      return this.lastSavedBlock + 1;
    }
    const transferDuration = await this.configWrapper.challengeDuration();
    return this.shelteringTransfersWrapper.earliestMeaningfulBlock(transferDuration);
  }

  async resolveTransfer(transferId) {
    if (!await this.shelteringTransfersWrapper.canResolve(transferId)) {
      throw new Error('Unable to resolve transfer - boundary check fail');
    }
    return this.shelteringTransfersWrapper.resolve(transferId);
  }
}
