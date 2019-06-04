/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import PeriodicWorker from './periodic_worker';

const CLEANUP_WORK_TYPE = 'BundleCleanup';

export default class CleanupWorker extends PeriodicWorker {
  constructor(dataModelEngine, workerTaskTrackingRepository, logger, workerInterval) {
    super(workerInterval, logger);
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.dataModelEngine = dataModelEngine;
  }

  async periodicWork() {
    let workId = null;
    try {
      workId = await this.workerTaskTrackingRepository.tryToBeginWork(CLEANUP_WORK_TYPE);
    } catch (err) {
      return;
    }
    try {
      const removedBundlesCount = await this.dataModelEngine.cleanupOutdatedBundles();
      this.logger.info(`Removed ${removedBundlesCount} outdated bundles`);
    } catch (err) {
      this.logger.error(err);
      throw err;
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }
}
