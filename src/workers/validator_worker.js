/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import {ValidationError} from '../errors/errors';
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
      const now = Math.floor(Date.now() / 1000);
      this.logger.info(`HermesBundlesValidatorWorker: validation start`);
      const hermresBundles = await this.bundleRepository.getHermesBundles(0);
      this.logger.info(`HermesBundlesValidatorWorker: hermes bundles count ${hermresBundles.length}`);
      //console.log(hermresBundles);
      for (const {bundleId, storagePeriods, bundleUploadTimestamp} of hermresBundles) {
        const expirationTime = bundleUploadTimestamp + storagePeriods*STORAGE_PERIOD_DURATION;
        if (now > expirationTime) {
          continue; //skip expired bundles
        }
        const bundleStore = await this.bundleStoreWrapper.contract();
        const shelterers = await bundleStore.methods.getShelterers(bundleId).call();
        //console.log(bundleId, shelterers);
        for (const shelterer of shelterers) {
          const sheltering = await this.shelteringWrapper.contract();
          const sheltererExpirationTime = await sheltering.methods.getShelteringExpirationDate(bundleId, shelterer).call();
          if (now > sheltererExpirationTime) {
            continue; //skip expired bundles (when sheltererExpirationTime < expirationTime)
          }
          try {
            await this.dataModelEngine.isValidBundle(bundleId, shelterer);
          } catch (err) {
            if (err instanceof ValidationError) {
              this.logger.info(`HermesBundlesValidatorWorker: Bundle failed to validate (${bundleId}, ${shelterer}): ${err.message || err}`);
              //todo: call atlas restore
            }
            throw new Error(`Could not fetch the bundle from the shelterer (${bundleId}, ${shelterer}): ${err.message || err}`);
          }
          this.logger.info(`HermesBundlesValidatorWorker: Valid bundle (${bundleId}, ${shelterer})`);
        }
      }
    } catch (err) {
      this.logger.error(`HermesBundlesValidatorWorker: ${err}`);
      //throw err; //unhadled error!
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }
}
