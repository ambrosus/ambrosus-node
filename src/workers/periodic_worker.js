/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Worker from './worker';

/** @abstract */
export default class PeriodicWorker extends Worker {
  constructor(interval, logger) {
    super(logger);
    this.interval = interval;
    this.timerId = null;
    this.quant = 30 * 1000;
    this.nextCall = 0;
  }

  async work() {
    process.once('SIGINT', async () => {
      await this.stop();
    });

    await this.beforeWorkLoop();
    return this.periodicWorkInternal();
  }

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

  async teardown() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }

    this.timerId = null;

    await this.afterWorkLoop();
  }

  /** @abstract */
  async periodicWork() {
    // throw new Error('Abstract method periodicWork() needs to be overridden');
  }

  /* placeholder */
  async isOutOfOrder() {
    return false;
  }

  async beforeWorkLoop() {
  }

  async afterWorkLoop() {
  }
}
