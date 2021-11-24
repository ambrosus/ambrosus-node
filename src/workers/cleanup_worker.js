/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import PeriodicWorker from './periodic_worker';

const CLEANUP_WORK_TYPE = 'BundleCleanup';

/**
 * Utility to periodically clean outdated Bundles
 * @extends PeriodicWorker
 */
export default class CleanupWorker extends PeriodicWorker {
  /**
   * @param {DataModelEngine} dataModelEngine - the utility to safely handle data operations
   * @param {WorkerTaskTrackingRepository} workerTaskTrackingRepository - the utility to store active workers
   * @param {Logger} logger - the logging utility
   * @param {number} workerInterval - the time of work intervals in seconds
   */
  constructor(dataModelEngine, workerTaskTrackingRepository, logger, workerInterval) {
    super(workerInterval, logger);
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.dataModelEngine = dataModelEngine;
  }

  /**
   * Overwritten method of PeriodicWorker abstract class
   * Periodically deletes outdated Bundles. User by PeriodicWorker internally
   * @returns {Promise<void>}
   */
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
