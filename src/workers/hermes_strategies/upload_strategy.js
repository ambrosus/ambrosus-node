/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/**
 * Represent Hermes Bundle upload strategy
 * @abstract
 */
export default class HermesUploadStrategy {
  /**
   * Returns default time interval for periodic worker
   * @returns {number}
   */
  get workerInterval() {
    return 1;
  }

  /**
   * Returns default storage period of time
   * @returns {number}
   */
  storagePeriods() {
    return 1;
  }

  /**
   * Should tell if Bundle should be created right now
   * @abstract
   * @param {Object} bundle - the Bundle object
   * @returns {Promise<{result: boolean}>}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async shouldBundle(bundle) {
    throw new Error('Should be implemented');
  }

  /**
   * Should tell if Bundle created successfully
   * @returns {Promise<void>}
   */
  async bundlingSucceeded() {
    throw new Error('Should be implemented');
  }
}
