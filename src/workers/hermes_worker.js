/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';

export default class HermesWorker extends PeriodicWorker {
  constructor(dataModelEngine, config, logger) {
    super(5000, logger);
    this.dataModelEngine = dataModelEngine;
    this.config = config;
    this.bundleSequenceNumber = 0;
  }

  async periodicWork() {
    this.logger.info('Trying to upload bundle...');
    const result = await this.dataModelEngine.finaliseBundle(this.bundleSequenceNumber++, this.config.bundleSizeLimit, this.config.storagePeriods);
    if (result !== null) {
      this.logger.info({message: 'Bundle successfully uploaded', bundleId: result.bundleId});
    }
  }
}
