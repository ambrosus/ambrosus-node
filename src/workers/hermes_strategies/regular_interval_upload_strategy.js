/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import HermesUploadStrategy from './upload_strategy';

export default class RegularIntervalUploadStrategy extends HermesUploadStrategy {
  get workerInterval() {
    return process.env.WORKER_INTERVAL || 300; // 5 minutes
  }

  storagePeriods() {
    return 1;
  }

  async shouldBundle(bundle) {
    const minimumItemsInBundle = process.env.WORKER_MINIMUM_ITEMS || 1;
    if (bundle.content.entries.length < minimumItemsInBundle) {
      return {result: false, reason: 'Too few entities to bundle'};
    }
    return {result: true};
  }

  async bundlingSucceeded() {
  }
}
