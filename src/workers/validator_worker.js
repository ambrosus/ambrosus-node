/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import PeriodicWorker from './periodic_worker';

const BUNDLES_VERIFY_WORK_TYPE = 'BundlesVerify';
const STORAGE_PERIOD_DURATION = 13 * 28 * 86400; //in seconds


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
      this.log_info(`Validation start`);
      const hermresBundles = await this.bundleRepository.getHermesBundles(0);
      this.log_info(`Hermes bundles count ${hermresBundles.length}`);
      //console.log(hermresBundles);
      for (const {bundleId, storagePeriods, bundleUploadTimestamp} of hermresBundles) {
        const expirationTime = bundleUploadTimestamp + storagePeriods*STORAGE_PERIOD_DURATION;
        if (this.now() > expirationTime) {
          continue; //skip expired bundles
        }
        const bundleStore = await this.bundleStoreWrapper.contract();
        const shelterers = await bundleStore.methods.getShelterers(bundleId).call();
        //console.log(bundleId, shelterers);
        for (const shelterer of shelterers) {
          //
          try {
            await this.validateAndRestoreBundle(bundleId, shelterer);
          } catch (err) {
            this.log_info(`validateAndRestoreBundle(${bundleId}, ${shelterer}) - ${err.message || err}`);
          }
          //
        }
      }
    } catch (err) {
      this.log_error(`${err.message || err}`);
      //throw err; //unhadled error!
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }

  async validateAndRestoreBundle(bundleId, shelterer) {
    const sheltering = await this.shelteringWrapper.contract();
    const sheltererExpirationTime = await sheltering.methods.getShelteringExpirationDate(bundleId, shelterer).call();
    if (this.now() > sheltererExpirationTime) {
      throw new Error('Bundle expired'); //skip expired bundles (when sheltererExpirationTime < expirationTime)
    }

    if (await this.dataModelEngine.isBundleValid(bundleId, shelterer)) {
      throw new Error('Bundle is valid');
    }

    this.log_info(`Trying to restore (${bundleId}, ${shelterer})`);
    const response = await this.dataModelEngine.remoteBundleRestoreCall(bundleId, shelterer);
    this.log_info(`Remote restore call returned: (${response})`);
  }

  now() {
    return Math.floor(Date.now() / 1000);
  }

  log_info(str) {
    this.logger.info(`HermesBundlesValidatorWorker: ${str}`);
  }
  
  log_error(str) {
    this.logger.error(`HermesBundlesValidatorWorker: ${str}`);
  }
}
