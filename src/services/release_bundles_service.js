/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import OperationalModes from '../utils/operational_modes';

const MAX_ONGOING_TRANSFERS = 20;

export default class ReleaseBundlesService {
  constructor(dataModelEngine, shelteringTransfersWrapper, retireTransfersRepository, workerLogger, operationalMode) {
    this.dataModelEngine = dataModelEngine;
    this.shelteringTransfersWrapper = shelteringTransfersWrapper;
    this.retireTransfersRepository = retireTransfersRepository;
    this.workerLogger = workerLogger;
    this.operationalMode = operationalMode;
    this.maxOngoingTransfers = MAX_ONGOING_TRANSFERS;
    this.shelteredBundles = null;
  }

  async process() {
    if (null === this.shelteredBundles) {
      const bundles = await this.dataModelEngine.getShelteredBundles();
      this.shelteredBundles = new Set(bundles.map((bundle) => bundle.bundleId));
      this.modeInfo = {
        mode: OperationalModes.retire,
        total: this.shelteredBundles.size,
        transfers: 0,
        transfered: 0
      };
      this.operationalMode.setModeInfo(OperationalModes.retire, this.modeInfo);
    }

    const transfers = await this.retireTransfersRepository.ongoingTransfers();
    const resolvedTransfers = this.retireTransfersRepository.getResolvedTransfers();

    for (const transfer of resolvedTransfers) {
      try {
        await this.dataModelEngine.removeBundle(transfer.bundleId);
        this.shelteredBundles.delete(transfer.bundleId);
        this.retireTransfersRepository.transferDone(transfer.transferId);
        this.modeInfo.transfered++;
      } catch (err) {
        await this.workerLogger.addLog(`Failed to remove bundle: ${err.message || err}`, transfer.bundleId, err.stack);
      }
    }

    if (transfers.length < this.maxOngoingTransfers) {
      let startedTransersCount = 0;
      for (const bundle of this.shelteredBundles) {
        try {
          await this.shelteringTransfersWrapper.start(bundle.bundleId);
          startedTransersCount++;
        } catch (err) {
          this.failedTransfersCache.rememberFailedResolution(bundle.bundleId, this.retryTimeout);
          await this.workerLogger.addLog(`Failed to start transfer: ${err.message || err}`, bundle, err.stack);
        }
      }
      this.modeInfo.transfered += startedTransersCount;
      this.workerLogger.logger.info(`Started new ${startedTransersCount} bundle transfers`);
    }
  }
}

