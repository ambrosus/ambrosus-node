/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import HermesUploadStrategy from './upload_strategy';

export default class RegularIntervalUploadStrategy extends HermesUploadStrategy {
  workerInterval() {
    return 300000; // 5 minutes
  }

  storagePeriods() {
    return 1;
  }

  async shouldBundle(bundle) {
    return bundle.content.entries.length > 0;
  }

  async bundlingSucceeded() {
  }
}
