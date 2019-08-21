/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {constants} from 'ambrosus-node-contracts';
import EventsCollector from './events_collector';

const TRANSFER_EVENT_ONE_FETCH_LIMIT = 5000;

export default class RetireTransfersRepository extends EventsCollector {
  constructor(transfersEventEmitterWrapper, blockchainStateWrapper, configWrapper, atlasAddress) {
    super(blockchainStateWrapper, TRANSFER_EVENT_ONE_FETCH_LIMIT);
    this.transfersEventEmitterWrapper = transfersEventEmitterWrapper;
    this.configWrapper = configWrapper;
    this.atlasAddress = atlasAddress;
    this.activeTransfers = {};
    this.resolvedTransfers = [];
  }

  async ongoingTransfers() {
    const {fromBlock, currentBlock} = await this.getBlockInfo();
    if (fromBlock <= currentBlock) {
      await this.updateTransfers(fromBlock, currentBlock);
      this.updateBlockInfo(currentBlock);
    }
    return Object.values(this.activeTransfers);
  }

  flushResolvedTransfers() {
    const transfers = this.resolvedTransfers;
    this.resolvedTransfers = [];
    return transfers;
  }

  transferDone(transferId) {
    delete this.resolvedTransfers[transferId];
  }

  async updateTransfers(fromBlock, currentBlock) {
    const startedTransfers = await this.collectEvents(fromBlock, currentBlock,
      (start, end) => this.transfersEventEmitterWrapper.transfers(start, end),
      ['transferId', 'donorId', 'bundleId']);
    const resolvedTransfers = await this.collectEvents(fromBlock, currentBlock,
      (start, end) => this.transfersEventEmitterWrapper.resolvedTransfers(start, end),
      ['transferId']);
    const cancelledTransfers = await this.collectEvents(fromBlock, currentBlock,
      (start, end) => this.transfersEventEmitterWrapper.cancelledTransfers(start, end),
      ['transferId']);
    this.applyIncomingTransferEvents(startedTransfers, resolvedTransfers, cancelledTransfers);
  }

  applyIncomingTransferEvents(startedTransfers, resolvedTransfers, cancelledTransfers) {
    const newTransfers = startedTransfers.filter(({donorId}) => donorId === this.atlasAddress);
    for (const transfer of newTransfers) {
      this.activeTransfers[transfer.transferId] = transfer;
    }
    for (const transfer of cancelledTransfers) {
      delete this.activeTransfers[transfer.transferId];
    }
    for (const transfer of resolvedTransfers) {
      const resolved = this.activeTransfers[transfer.transferId];
      if (resolved !== undefined) {
        this.resolvedTransfers.push(resolved);
        delete this.activeTransfers[transfer.transferId];
      }
    }
  }

  async getFromBlock() {
    if (this.lastSavedBlock > 0) {
      return this.lastSavedBlock + 1;
    }
    const transferDuration = await this.configWrapper.challengeDuration();
    return Math.max(0, await this.blockchainStateWrapper.getCurrentBlockNumber() - Math.ceil(transferDuration / constants.MIN_BLOCK_TIME));
  }
}
