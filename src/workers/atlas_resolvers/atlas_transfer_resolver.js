/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import promClient from 'prom-client';
import BundleShelteringResolver from './bundle_sheltering_resolver';
import {atlasResolutionStatus} from './atlas_resolver';

/**
 * Utility method to resolve transfer of Bundles between Atlas nodes
 * @extends BundleShelteringResolver
 */
export default class AtlaTransferResolver extends BundleShelteringResolver {
  /**
   * @param {Web3} web3 - the web3.js library
   * @param {DataModelEngine} dataModelEngine - the utility to handle data operations
   * @param {TransfersRepository} transfersRepository - the utility to handle transfer events storage
   * @param {FailedResolutionsCache} failedTransfersCache - the utility to store failed transfer events
   * @param {AtlasParticipationStrategy} strategy - the Atlas resolution strategy
   * @param {WorkerLogger} workerLogger - the logging utility
   * @param {BundleStoreWrapper} bundleStoreWrapper - the wrapper around smart contract from ambrosus-node-contracts
   */
  constructor(
    web3,
    dataModelEngine,
    transfersRepository,
    failedTransfersCache,
    strategy,
    workerLogger,
    bundleStoreWrapper
  ) {
    super(web3,
      dataModelEngine,
      transfersRepository,
      failedTransfersCache,
      strategy,
      workerLogger,
      'Transfer'
    );
    this.bundleStoreWrapper = bundleStoreWrapper;
  }

  /**
   * Overwritten method of BundleShelteringResolver abstract class
   * @param transfer
   * @returns {*}
   */
  getPropositionId(transfer) {
    return transfer.transferId;
  }

  /**
   * Overwritten method of BundleShelteringResolver abstract class
   * @param transfer
   * @returns {*}
   */
  getSheltererId(transfer) {
    return transfer.donorId;
  }

  /**
   * Overwritten method of AtlasResolver abstract class
   * @param registry
   */
  addMetrics(registry) {
    this.atlasResolverMetrics = new promClient.Counter({
      name: 'atlas_transfers_total',
      help: `Total number of transfers. Status label is one of [${Object.values(atlasResolutionStatus)}]`,
      labelNames: ['status'],
      registers: [registry]
    });
  }

  /**
   * Generates random number
   * @param max
   * @returns {number}
   */
  getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  /**
   * Overwritten method of BundleShelteringResolver abstract class
   * @param proposition
   * @returns {Promise<*>}
   */
  async tryToDownload(proposition) {
    const propositionExpirationTime = await this.resolutionsRepository.getExpirationTimeInMs(proposition);
    let metadata;
    try {
      metadata = await this.dataModelEngine.downloadBundle(proposition.bundleId, this.getSheltererId(proposition), propositionExpirationTime);
      await this.workerLogger.addLog('Bundle fetched', proposition);
    } catch (err) {
      await this.workerLogger.logger.info(`Failed to download bundle: ${err.message || err}`, proposition, err.stack);
      const donors = await this.getBundleDonors(proposition);
      while (donors.length > 0) {
        const pos = this.getRandomInt(donors.length);
        const donorId = donors[pos];
        try {
          metadata = await this.dataModelEngine.downloadBundle(proposition.bundleId, donorId, propositionExpirationTime);
          await this.workerLogger.addLog('Bundle fetched', {bundleId: proposition.bundleId, donorId});
          break;
        } catch (err) {
          await this.workerLogger.logger.info(`Failed to download bundle: ${err.message || err}`, {
            bundleId: proposition.bundleId,
            donorId
          }, err.stack);
          donors.splice(pos, 1);
        }
      }
    }
    if (metadata === undefined) {
      throw new Error('No donors available for downloading bundle');
    }
    return metadata;
  }

  /**
   * Gets shelter Bundles from the blockchain network
   * @param proposition
   * @returns {Promise<*>}
   */
  async getBundleDonors(proposition) {
    const shelterers = await this.bundleStoreWrapper.getShelterers(proposition.bundleId);
    let pos = shelterers.indexOf(proposition.donorId);
    while (-1 !== pos) {
      shelterers.splice(pos, 1);
      pos = shelterers.indexOf(proposition.donorId);
    }
    shelterers.push(await this.bundleStoreWrapper.getUploader(proposition.bundleId));
    return shelterers;
  }
}
