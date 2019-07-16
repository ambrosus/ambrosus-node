/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import promClient from 'prom-client';
import AtlasParticipationStrategy from '../atlas_strategies/atlas_participation_strategy';
import {AtlasResolver, atlasResolutionStatus} from './atlas_resolver';
import {getDefaultAddress} from '../../utils/web3_tools';

export default class AtlaTransferResolver extends AtlasResolver {
  constructor(
    web3,
    dataModelEngine,
    transfersRepository,
    failedTransfersCache,
    strategy,
    workerLogRepository,
    logger
  ) {
    super();
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.strategy = strategy;
    this.transfersRepository = transfersRepository;
    this.failedTransfersCache = failedTransfersCache;
    this.workerLogRepository = workerLogRepository;
    this.logger = logger;

    if (!(this.strategy instanceof AtlasParticipationStrategy)) {
      throw new Error('A valid transfer strategy must be provided');
    }
  }

  async tryToResolve({bundleId}, {transferId}) {
    await this.transfersRepository.resolveTransfer(transferId);
    await this.dataModelEngine.markBundleAsSheltered(bundleId);
    await this.addLog('🍾 Yahoo! The bundle is ours.', {bundleId});
  }

  async tryToDownload({donorId, bundleId, transferId}) {
    const transferExpirationTime = await this.transfersRepository.getTransferExpirationTimeInMs(transferId);
    const metadata = await this.dataModelEngine.downloadBundle(bundleId, donorId, transferExpirationTime);
    await this.addLog(`Bundle fetched`, {donorId, bundleId, transferId});
    return metadata;
  }

  async isTurnToResolve({transferId}) {
    const currentResolver = await this.transfersRepository.getTransferDesignatedShelterer(transferId);
    return (currentResolver === getDefaultAddress(this.web3));
  }

  async tryWithTransfer(transfer) {
    try {
      if (this.failedTransfersCache.didResolutionFailRecently(transfer.transferId)) {
        return false;
      }
      if (!await this.isTurnToResolve(transfer)) {
        this.atlasTransferMetrics.inc({status: atlasResolutionStatus.shouldNotResolve});
        await this.addLog(`Not the node's turn to resolve`, transfer);
        return false;
      }

      if (!await this.strategy.shouldFetchBundle(transfer)) {
        this.atlasTransferMetrics.inc({status: atlasResolutionStatus.shouldNotFetch});
        await this.addLog('Decided not to download bundle', transfer);
        return false;
      }

      const bundleMetadata = await this.tryToDownload(transfer);
      if (!await this.strategy.shouldResolve(bundleMetadata)) {
        this.atlasTransferMetrics.inc({status: atlasResolutionStatus.shouldNotResolve});
        await this.addLog('Transfer resolution cancelled', transfer);
        return false;
      }

      await this.tryToResolve(bundleMetadata, transfer);
      await this.strategy.afterResolution(transfer);
      this.atlasTransferMetrics.inc({status: atlasResolutionStatus.resolved});
      return true;
    } catch (err) {
      this.failedTransfersCache.rememberFailedResolution(transfer.transferId, this.strategy.retryTimeout);
      await this.addLog(`Failed to resolve transfer: ${err.message || err}`, transfer, err.stack);
      this.atlasTransferMetrics.inc({status: atlasResolutionStatus.failed});
      return false;
    }
  }

  async addLog(message, additionalFields, stacktrace) {
    const log = {
      message,
      ...additionalFields
    };
    this.logger.info({...log, stacktrace});
    await this.workerLogRepository.storeLog({timestamp: new Date(), ...log});
  }

  addMetrics(registry) {
    this.atlasTransferMetrics = new promClient.Counter({
      name: 'atlas_transfers_total',
      help: `Total number of transfers. Status label is one of [${Object.values(atlasResolutionStatus)}]`,
      labelNames: ['status'],
      registers: [registry]
    });
  }

  async resolve(entity) {
    return await this.tryWithTransfer(entity);
  }

  async resolveOne() {
    const transfers = await this.transfersRepository.ongoingResolutions();
    const recentlyFailedTransfers = transfers.filter(({transferId}) => transferId in this.failedTransfersCache.failedResolutionsEndTime);
    await this.addLog(`Transfers preselected for resolution: ${transfers.length} (out of which ${recentlyFailedTransfers.length} have failed recently)`);
    for (const transfer of transfers) {
      const successful = await this.tryWithTransfer(transfer);
      if (successful) {
        break;
      }
    }
    this.failedTransfersCache.clearOutdatedResolutions();
  }

  async resolveAll() {
    const transfers = await this.transfersRepository.ongoingResolutionss();
    const recentlyFailedTransfers = transfers.filter(({transferId}) => transferId in this.failedTransfersCache.failedResolutionsEndTime);
    await this.addLog(`Transfers preselected for resolution: ${transfers.length} (out of which ${recentlyFailedTransfers.length} have failed recently)`);
    for (const transfer of transfers) {
      await this.tryWithTransfer(transfer);
    }
    this.failedTransfersCache.clearOutdatedResolutions();
  }
}
