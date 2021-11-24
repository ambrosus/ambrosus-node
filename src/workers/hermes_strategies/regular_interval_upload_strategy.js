/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import HermesUploadStrategy from './upload_strategy';

/**
 * Upload strategy that requires regular upload of newly created Bundles
 * @abstract
 */
export default class RegularIntervalUploadStrategy extends HermesUploadStrategy {
  /**
   * Overwritten method of HermesUploadStrategy abstract class
   * @returns {string|number}
   */
  get workerInterval() {
    return process.env.WORKER_INTERVAL || 300; // 5 minutes
  }

  /**
   * Overwritten method of HermesUploadStrategy abstract class
   * @returns {number}
   */
  storagePeriods() {
    return 1;
  }

  /**
   * Overwritten method of HermesUploadStrategy abstract class
   * @param bundle
   * @returns {Promise<{result: boolean, reason: string}|{result: boolean}>}
   */
  async shouldBundle(bundle) {
    const minimumItemsInBundle = process.env.WORKER_MINIMUM_ITEMS || 1;
    if (bundle.content.entries.length < minimumItemsInBundle) {
      return {result: false, reason: 'Too few entities to bundle'};
    }
    return {result: true};
  }

  /**
   * Overwritten method of HermesUploadStrategy abstract class
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async bundlingSucceeded() {
  }
}
