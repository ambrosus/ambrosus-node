/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Worker from './worker';

export default class PeriodicWorker extends Worker {
  constructor(interval, logger) {
    super(logger);
    this.interval = interval;
    this.timerId = null;
  }

  async work() {
    await this.beforeWorkLoop();
    this.timerId = setInterval(
      () => {
        this.periodicWork().catch((err) => this.logger.error(err));
      },
      this.interval);
  }

  async teardown() {
    clearInterval(this.timerId);
    this.timerId = null;
    await this.afterWorkLoop();
  }

  async periodicWork() {
    throw new Error('Abstract method work() needs to be overridden');
  }

  async beforeWorkLoop() {

  }

  async afterWorkLoop() {

  }
}
