/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import promClient from 'prom-client';
import BundleShelteringResolver from './bundle_sheltering_resolver';
import {atlasResolutionStatus} from './atlas_resolver';

export default class AtlaTransferResolver extends BundleShelteringResolver {
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

  getPropositionId(transfer) {
    return transfer.transferId;
  }

  getSheltererId(transfer) {
    return transfer.donorId;
  }

  addMetrics(registry) {
    this.atlasResolverMetrics = new promClient.Counter({
      name: 'atlas_transfers_total',
      help: `Total number of transfers. Status label is one of [${Object.values(atlasResolutionStatus)}]`,
      labelNames: ['status'],
      registers: [registry]
    });
  }

  getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

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
          await this.workerLogger.logger.info(`Failed to download bundle: ${err.message || err}`, {bundleId: proposition.bundleId, donorId}, err.stack);
          donors.splice(pos, 1);
        }
      }
    }
    if (metadata === undefined) {
      throw new Error('No donors available for downloading bundle');
    }
    return metadata;
  }

  async getBundleDonors(proposition) {
    const contract = await this.bundleStoreWrapper.contract();
    const shelterers = await contract.methods.getShelterers(proposition.bundleId).call();
    let pos = shelterers.indexOf(proposition.donorId);
    while (-1 !== pos) {
      shelterers.splice(pos, 1);
      pos = shelterers.indexOf(proposition.donorId);
    }
    shelterers.push(await contract.methods.getUploader(proposition.bundleId).call());
    return shelterers;
  }
}
