/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Worker from './worker';

/**
 * Represents worker that should be run regularly with some time interval
 * @abstract
 * @extends Worker
 */
export default class PeriodicWorker extends Worker {
  /**
   * @param {number} interval - the work interval in seconds
   * @param {Logger} logger - the logging utility
   */
  constructor(interval, logger) {
    super(logger);
    this.interval = interval;
    this.timerId = null;
    this.quant = 30 * 1000;
    this.nextCall = 0;
  }

  /**
   * Overwritten method ot Worker abstract class
   * Starts periodic work. Used by Worker internally
   * @returns {Promise<void>}
   */
  async work() {
    process.once('SIGINT', async () => {
      await this.stop();
    });

    await this.beforeWorkLoop();
    return this.periodicWorkInternal();
  }

  /**
   * Internal utility function. Controls work cycles
   * @returns {Promise<void>}
   */
  async periodicWorkInternal() {
    if (this.started) {
      this.timeLeft = this.nextCall - Date.now();

      if ((this.timeLeft < 0) || (await this.isOutOfOrder())) {
        this.nextCall = Date.now() + (this.interval * 1000);

        await this.periodicWork();

        this.timeLeft = this.nextCall - Date.now();
      }

      let currentInterval = this.quant;

      if (this.timeLeft < this.quant) {
        currentInterval = this.timeLeft;
      }

      this.timerId = setTimeout(() => this.periodicWorkInternal(), currentInterval);
    }
  }

  /**
   * Overwritten method of Worker abstract class. Used internally be Worker
   * @returns {Promise<void>}
   */
  async teardown() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }

    this.timerId = null;

    await this.afterWorkLoop();
  }

  /**
   * Should contain work that should be done in one work cycle
   * @abstract
   * @returns {Promise<void>}
   */
  async periodicWork() {
    // throw new Error('Abstract method periodicWork() needs to be overridden');
  }

  /**
   * Should check if work cycle should be restarted
   * @returns {Promise<boolean>}
   */
  async isOutOfOrder() {
    return false;
  }

  /**
   * Should contain logic that should be done before starting work cycle
   * @abstract
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async beforeWorkLoop() {
  }

  /**
   * Should contain logic that should be done after finishing work cycle
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async afterWorkLoop() {
  }
}
