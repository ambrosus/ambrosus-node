/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class Worker {
  constructor(logger) {
    this.logger = logger;
    this.started = false;
  }

  async start() {
    if (this.started) {
      throw new Error('Already started');
    }
    this.started = true;
    await this.work();
  }

  async stop() {
    if (!this.started) {
      throw new Error(`Wasn't started`);
    }
    this.started = false;

    await this.teardown();
  }

  async work() {
    throw new Error('Abstract method work() needs to be overridden');
  }

  async teardown() {
    throw new Error('Abstract method work() needs to be overridden');
  }
}
