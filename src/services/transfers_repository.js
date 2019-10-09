/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ResolutionsRepository from './resolutions_repository';

const TRANSFER_EVENT_ONE_FETCH_LIMIT = 50000;

export default class TransfersRepository extends ResolutionsRepository {
  constructor(shelteringTransfersWrapper, transfersEventEmitterWrapper, configWrapper, blockchainStateWrapper, activeTransfersCache) {
    super(blockchainStateWrapper, activeTransfersCache, TRANSFER_EVENT_ONE_FETCH_LIMIT);
    this.shelteringTransfersWrapper = shelteringTransfersWrapper;
    this.transfersEventEmitterWrapper = transfersEventEmitterWrapper;
    this.configWrapper = configWrapper;
  }

  async updateActiveResolutionsCache(fromBlock, currentBlock) {
    const startedTransfers = await this.collectEvents(fromBlock, currentBlock,
      (start, end) => this.transfersEventEmitterWrapper.transfers(start, end),
      ['transferId', 'donorId', 'bundleId']);
    const resolvedTransfers = await this.collectEvents(fromBlock, currentBlock,
      (start, end) => this.transfersEventEmitterWrapper.resolvedTransfers(start, end),
      ['transferId']);
    const cancelledTransfers = await this.collectEvents(fromBlock, currentBlock,
      (start, end) => this.transfersEventEmitterWrapper.cancelledTransfers(start, end),
      ['transferId']);
    this.activeResolutionsCache.applyIncomingResolutionEvents(startedTransfers, resolvedTransfers, cancelledTransfers);
  }

  async getFromBlock() {
    if (this.lastSavedBlock > 0) {
      return this.lastSavedBlock + 1;
    }
    return 0;
  }

  async getExpirationTimeInMs(transfer) {
    const transferCreationTime = await this.shelteringTransfersWrapper.getTransferCreationTime(transfer.transferId);
    const transferDuration = await this.configWrapper.challengeDuration();
    return (Number(transferCreationTime) + Number(transferDuration)) * 1000;
  }

  async resolve(transfer) {
    if (!await this.shelteringTransfersWrapper.canResolve(transfer.transferId)) {
      throw new Error('Unable to resolve transfer - boundary check fail');
    }
    return this.shelteringTransfersWrapper.resolve(transfer.transferId);
  }

  async getDesignatedShelterer(transfer) {
    return await this.shelteringTransfersWrapper.getTransferDesignatedShelterer(transfer.transferId);
  }
}
