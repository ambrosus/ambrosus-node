/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const MAX_ONGOING_TRANSFERS = 20;
const MAX_SHELTERING_CHECKS = 50;

export default class ReleaseBundlesService {
  constructor(dataModelEngine, shelteringWrapper, shelteringTransfersWrapper, retireTransfersRepository, workerLogger, operationalMode) {
    this.dataModelEngine = dataModelEngine;
    this.shelteringWrapper = shelteringWrapper;
    this.shelteringTransfersWrapper = shelteringTransfersWrapper;
    this.retireTransfersRepository = retireTransfersRepository;
    this.workerLogger = workerLogger;
    this.operationalMode = operationalMode;
    this.maxOngoingTransfers = MAX_ONGOING_TRANSFERS;
    this.shelteredBundles = null;
  }

  reset() {
    this.shelteredBundles = null;
    this.modeInfo = null;
  }

  async process() {
    let infoUpdated = false;
    if (null === this.shelteredBundles) {
      const bundles = await this.dataModelEngine.getShelteredBundles(0);
      this.shelteredBundles = new Set(bundles.map((bundle) => bundle.bundleId));
      this.modeInfo = {
        total: this.shelteredBundles.size,
        transfers: 0,
        transfered: 0
      };
      this.operationalMode.setInfo(this.modeInfo);
    }

    const transfers = await this.retireTransfersRepository.ongoingTransfers();
    const resolvedTransfers = this.retireTransfersRepository.getResolvedTransfers();

    for (const transfer of transfers) {
      if (this.shelteredBundles.delete(transfer.bundleId)) {
        this.modeInfo.transfers++;
        infoUpdated = true;
      }
    }

    for (const transfer of resolvedTransfers) {
      try {
        await this.dataModelEngine.removeBundle(transfer.bundleId);
        this.shelteredBundles.delete(transfer.bundleId);
        this.retireTransfersRepository.transferDone(transfer.transferId);
        this.modeInfo.transfered++;
        if (this.modeInfo.transfers > 0) {
          this.modeInfo.transfers--;
        }
        infoUpdated = true;
      } catch (err) {
        await this.workerLogger.addLog(`Failed to remove bundle: ${err.message || err}`, transfer.bundleId, err.stack);
      }
    }

    if (transfers.length < this.maxOngoingTransfers) {
      let startedTransersCount = 0;
      let shelteringChecks = 0;
      for (const bundleId of this.shelteredBundles) {
        try {
          shelteringChecks++;
          if (await this.shelteringWrapper.isSheltering(bundleId)) {
            await this.shelteringTransfersWrapper.start(bundleId);
            startedTransersCount++;
            this.shelteredBundles.delete(bundleId);
            if ((startedTransersCount + transfers.length) >= this.maxOngoingTransfers) {
              break;
            }
          } else {
            this.shelteredBundles.delete(bundleId);
            await this.dataModelEngine.removeBundle(bundleId);
            this.modeInfo.transfered++;
          }
          if (shelteringChecks >= MAX_SHELTERING_CHECKS) {
            infoUpdated = true;
          }
        } catch (err) {
          // TODO: this.failedTransfersCache.rememberFailedResolution(bundleId, this.retryTimeout);
          await this.workerLogger.addLog(`Failed to start transfer: ${err.message || err}`, {bundleId}, err.stack);
        }
      }
      if (startedTransersCount > 0) {
        this.modeInfo.transfers += startedTransersCount;
        infoUpdated = true;
        this.workerLogger.logger.info(`Started new ${startedTransersCount} bundle transfers`);
      }
    }

    if (infoUpdated) {
      this.operationalMode.setInfo(this.modeInfo);
    }
  }
}

