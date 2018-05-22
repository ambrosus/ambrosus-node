/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';
import {getTimestamp} from '../utils/time_utils';

export default class BundleFinaliser extends PeriodicWorker {
  constructor(dataModelEngine, interval, sizeLimit, output = console) {
    super(interval);
    this.dataModelEngine = dataModelEngine;
    this.sizeLimit = sizeLimit;
    this.output = output;
  }

  async work() {
    return this.finalise();
  }

  async finalise() {
    const bundleStubId = getTimestamp().toString();
    const bundle = await this.dataModelEngine.finaliseBundle(bundleStubId, this.sizeLimit);
    if (bundle) {
      this.output.log(`Bundle ${bundle.bundleId} with ${bundle.content.entries.length} entries created`);
    }
  }
}
