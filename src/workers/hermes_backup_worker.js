/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import PeriodicWorker from './periodic_worker';

const HERMES_BACKUP_WORK_TYPE = 'HermesBackup';

/**
 * Instance of PeriodicWorker
 * Periodically does DB backups
 */
export default class HermesBackupWorker extends PeriodicWorker {
  /**
   * @param {HermesBackup} hermesBackup - the backup handling service
   * @param {WorkerTaskTrackingRepository} workerTaskTrackingRepository - the utility to store worker's tasks in progress
   * @param {Logger} logger - the logging utility
   * @param {number} workerInterval - the worker interval in seconds
   */
  constructor(hermesBackup, workerTaskTrackingRepository, logger, workerInterval) {
    super(workerInterval, logger);
    this.hermesBackup = hermesBackup;
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.logger = logger;
  }

  /**
   * Overwritten method of PeriodicWorker abstract class
   * Contains work that should be done periodically and used by PeriodicWorker internally
   * @returns {Promise<void>}
   */
  async periodicWork() {
    this.logger.info(`HermesBackupWorker: start`);
    let workId = null;
    try {
      workId = await this.workerTaskTrackingRepository.tryToBeginWork(HERMES_BACKUP_WORK_TYPE);
    } catch (err) {
      return;
    }
    try {
      await this.hermesBackup.save();
    } catch (err) {
      this.logger.info(`HermesBackupWorker: unhandled error - ${err.message || err}`);
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }
}
