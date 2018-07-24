/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';
import {getTimestamp} from '../utils/time_utils';

export default class BundleFinaliser extends PeriodicWorker {
  constructor(dataModelEngine, interval, sizeLimit, logger) {
    super(interval, logger);
    this.dataModelEngine = dataModelEngine;
    this.sizeLimit = sizeLimit;
  }

  async work() {
    return this.finalise();
  }

  async finalise() {
    const bundleStubId = getTimestamp().toString();
    const bundle = await this.dataModelEngine.finaliseBundle(bundleStubId, this.sizeLimit);
    if (bundle) {
      this.logger.info(`Bundle ${bundle.bundleId} with ${bundle.content.entries.length} entries created`);
    }
  }
}
