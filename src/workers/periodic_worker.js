/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class PeriodicWorker {
  constructor(interval) {
    this.interval = interval;
    this.timerId = null;
  }

  async start() {
    if (this.timerId !== null) {
      throw new Error('Already started');
    }

    await this.beforeStart();
    this.timerId = setInterval(() => {
      this.work().catch(console.error);
    }, this.interval);
  }

  async beforeStart() {

  }

  async work() {
    throw new Error('Abstract method work() needs to be overridden');
  }
}
