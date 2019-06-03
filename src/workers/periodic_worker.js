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
    this.minimumInterval = 1000;
  }

  async work() {
    process.once('SIGINT', async () => {
      await this.stop();
    });

    await this.beforeWorkLoop();
    return this.periodicWorkInternal();
  }

  async periodicWorkInternal() {
    const elapsedTimeInMilliseconds = await this.executeAndMeasureTime(() => this.periodicWork());
    if (this.started) {
      const interval = Math.max(this.minimumInterval, (this.interval * 1000) - elapsedTimeInMilliseconds);
      this.timerId = setTimeout(() => this.periodicWorkInternal(), interval);
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
    throw new Error('Abstract method work() needs to be overridden');
  }

  async beforeWorkLoop() {
  }

  async afterWorkLoop() {
  }

  async executeAndMeasureTime(functionToExecute) {
    const startTime = Date.now();
    try {
      await functionToExecute();
    } catch (err) {
      this.logger.error(err);
    }
    return Date.now() - startTime;
  }
}
