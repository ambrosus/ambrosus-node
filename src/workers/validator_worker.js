/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import PeriodicWorker from './periodic_worker';
import builder from '../builder';

const BUNDLES_VERIFY_WORK_TYPE = 'BundlesVerify';
const STORAGE_PERIOD_DURATION = 13 * 28 * 86400; // in seconds


export default class HermesBundlesValidatorWorker extends PeriodicWorker {
  constructor(dataModelEngine, workerTaskTrackingRepository, bundleRepository, bundleStoreWrapper, shelteringWrapper, logger, workerInterval) {
    super(workerInterval, logger);
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.dataModelEngine = dataModelEngine;
    this.bundleRepository = bundleRepository;
    this.bundleStoreWrapper = bundleStoreWrapper;
    this.shelteringWrapper = shelteringWrapper;
  }

  async periodicWork() {
    let workId = null;
    try {
      workId = await this.workerTaskTrackingRepository.tryToBeginWork(BUNDLES_VERIFY_WORK_TYPE);
    } catch (err) {
      return;
    }
    try {
      this.logInfo(`Validation start`);

      const hermresBundles = await this.bundleRepository.getHermesBundles(0);
      this.logInfo(`Hermes bundles count ${hermresBundles.length}`);

      for (const {bundleId, storagePeriods, bundleUploadTimestamp} of hermresBundles) {
        const expirationTime = bundleUploadTimestamp + (storagePeriods * STORAGE_PERIOD_DURATION);
        if (this.now() > expirationTime) {
          continue; // skip expired bundles
        }
        const shelterers = await builder.contracts.bundleStoreWrapperContract.methods.getShelterers(bundleId).call();
        if (shelterers.length === 0) {
          this.logInfo(`No shelterers: ${bundleId}`);
        }

        for (const shelterer of shelterers) {
          await this.validateAndRestoreBundle(bundleId, shelterer);
        }
      }
    } catch (err) {
      this.logError(`unhandled error - ${err.message || err}`);
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }

  async validateAndRestoreBundle(bundleId, shelterer) {
    try {
      const sheltererExpirationTime = await builder.contracts.shelteringWrapperContract.methods.getShelteringExpirationDate(bundleId, shelterer).call();
      if (this.now() > sheltererExpirationTime) {
        throw new Error('Bundle expired'); // skip expired bundles (when sheltererExpirationTime < expirationTime)
      }
      if (await this.dataModelEngine.isBundleValid(bundleId, shelterer)) {
        throw new Error('Bundle is valid');
      }

      this.logInfo(`Trying to restore (${bundleId}, ${shelterer})`);
      const response = await this.dataModelEngine.remoteBundleRestoreCall(bundleId, shelterer);
      this.logInfo(`Remote restore call returned: (${response})`);
    } catch (err) {
      this.logInfo(`validateAndRestoreBundle(${bundleId}, ${shelterer}) - ${err.message || err}`);
    }
  }

  now() {
    return Math.floor(Date.now() / 1000);
  }

  logInfo(str) {
    this.logger.info(`HermesBundlesValidatorWorker: ${str}`);
  }

  logError(str) {
    this.logger.error(`HermesBundlesValidatorWorker: ${str}`);
  }
}
