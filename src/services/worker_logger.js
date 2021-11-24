/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/**
 * Logging utility to use in workers
 */
export default class WorkerLogger {
  constructor(logger, workerLogRepository) {
    this.logger = logger;
    this.workerLogRepository = workerLogRepository;
  }

  /**
   * Loggs message and stores it in DB
   * @param {String} message - the message
   * @param {Object} [additionalFields] - the object with fields to be added in message
   * @param {Object} [stacktrace]
   * @returns {Promise<void>}
   */
  async addLog(message, additionalFields, stacktrace) {
    const log = {
      message,
      ...additionalFields
    };
    this.logger.info({...log, stacktrace});
    await this.workerLogRepository.storeLog({timestamp: new Date(), ...log});
  }
}
