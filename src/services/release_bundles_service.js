/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const MAX_ONGOING_TRANSFERS = 20;
const MAX_SHELTERING_CHECKS = 25;
const TRANSACTIONS_INTERVAL = 1000;

const sleep = async (timeout) => new Promise((resolve) => {
  setTimeout(resolve, timeout);
});

export default class ReleaseBundlesService {
  constructor(bundleRepository, shelteringWrapper, shelteringTransfersWrapper, retireTransfersRepository, workerLogger, operationalMode, transactionsInterval = TRANSACTIONS_INTERVAL) {
    this.bundleRepository = bundleRepository;
    this.shelteringWrapper = shelteringWrapper;
    this.shelteringTransfersWrapper = shelteringTransfersWrapper;
    this.retireTransfersRepository = retireTransfersRepository;
    this.workerLogger = workerLogger;
    this.operationalMode = operationalMode;
    this.transactionsInterval = transactionsInterval;
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
      const bundles = await this.bundleRepository.getShelteredBundles(0);
      this.shelteredBundles = new Set(bundles.map((bundle) => bundle.bundleId));
      this.modeInfo = {
        total: this.shelteredBundles.size,
        transfers: 0,
        transfered: 0,
        started: 0,
        extra: 0,
        removed: 0,
        now: 0,
        failed: 0
      };
      this.operationalMode.setInfo(this.modeInfo);
    }

    const transfers = await this.retireTransfersRepository.ongoingTransfers();
    const resolvedTransfers = this.retireTransfersRepository.flushResolvedTransfers();

    for (const transfer of transfers) {
      if (this.shelteredBundles.delete(transfer.bundleId)) {
        this.modeInfo.transfers++;
        infoUpdated = true;
      }
    }

    for (const transfer of resolvedTransfers) {
      try {
        await this.bundleRepository.removeBundle(transfer.bundleId);
        this.modeInfo.removed++;
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
          infoUpdated = true;
          shelteringChecks++;
          if (await this.shelteringWrapper.isSheltering(bundleId)) {
            await this.shelteringTransfersWrapper.start(bundleId);
            startedTransersCount++;
            this.modeInfo.started++;
            this.shelteredBundles.delete(bundleId);
            if ((startedTransersCount + transfers.length) >= this.maxOngoingTransfers) {
              break;
            }
          } else {
            this.shelteredBundles.delete(bundleId);
            await this.bundleRepository.removeBundle(bundleId);
            this.modeInfo.removed++;
            this.modeInfo.transfered++;
            this.modeInfo.extra++;
          }
        } catch (err) {
          // TODO: this.failedTransfersCache.rememberFailedResolution(bundleId, this.retryTimeout);
          await this.workerLogger.addLog(`Failed to start transfer: ${err.message || err}`, {bundleId}, err.stack);
          this.modeInfo.failed++;
        }
        if (shelteringChecks >= MAX_SHELTERING_CHECKS) {
          break;
        }
        await sleep(this.transactionsInterval);
      }
      if (startedTransersCount > 0) {
        this.modeInfo.transfers += startedTransersCount;
        this.workerLogger.logger.info(`Started new ${startedTransersCount} bundle transfers`);
      }
    }

    if (infoUpdated) {
      this.modeInfo.now = this.shelteredBundles.size;
      this.operationalMode.setInfo(this.modeInfo);
    }
  }
}

