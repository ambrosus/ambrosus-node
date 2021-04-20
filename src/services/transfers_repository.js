/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {constants} from 'ambrosus-node-contracts';
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
    const transferDuration = await this.configWrapper.challengeDuration();
    return Math.max(0, await this.blockchainStateWrapper.getCurrentBlockNumber() - Math.ceil(transferDuration / constants.MIN_BLOCK_TIME));
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
    const status = await this.shelteringTransfersWrapper.resolve(transfer.transferId);
    for (const event of Object.values(status.events)) {
      for (const topic of event.raw.topics) {
        if (topic === '0x3c966c8db7f2d3710208024f326cb0e40b2b7122b76c3dba57ae105918ff15a1') {
          return status;
        }
      }
    }
    throw new Error('Transfer canceled');
  }

  async getDesignatedShelterer(transfer) {
    return await this.shelteringTransfersWrapper.getTransferDesignatedShelterer(transfer.transferId);
  }
}
