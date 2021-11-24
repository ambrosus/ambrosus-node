/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/**
 * Represents generic worker
 * @abstract
 */
export default class Worker {
  /**
   *
   * @param {Logger} logger - the logging utility
   */
  constructor(logger) {
    this.logger = logger;
    this.started = false;
  }

  /**
   * Starts work
   * @returns {Promise<void>}
   */
  async start() {
    if (this.started) {
      throw new Error('Already started');
    }
    this.started = true;
    await this.work();
  }

  /**
   * Stops work
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.started) {
      throw new Error(`Wasn't started`);
    }
    this.started = false;

    await this.teardown();
  }

  /**
   * Represents work that should be done
   * @abstract
   * @returns {Promise<void>}
   */
  async work() {
    throw new Error('Abstract method work() needs to be overridden');
  }

  /**
   * Contains actions that should be done before stop worker
   * @abstract
   * @returns {Promise<void>}
   */
  async teardown() {
    throw new Error('Abstract method work() needs to be overridden');
  }
}
