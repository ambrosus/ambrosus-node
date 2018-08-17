/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';
import HermesUploadStrategy from './hermes_strategies/upload_strategy';

export default class HermesWorker extends PeriodicWorker {
  constructor(dataModelEngine, configContract, strategy, logger) {
    super(strategy.workerInterval, logger);
    this.dataModelEngine = dataModelEngine;
    this.bundleSequenceNumber = 0;
    this.strategy = strategy;
    this.configContract = configContract;
    if (!(this.strategy instanceof HermesUploadStrategy)) {
      throw new Error('A valid strategy must be provided');
    }
  }

  async periodicWork() {
    const bundleSizeLimit = await this.configContract.bundleSizeLimit();
    const bundle = await this.dataModelEngine.initialiseBundling(this.bundleSequenceNumber, bundleSizeLimit);

    if (await this.strategy.shouldBundle(bundle)) {
      await this.performBundling(bundle);
    } else {
      await this.dataModelEngine.cancelBundling(this.bundleSequenceNumber);
      this.logger.info('Bundling process canceled');
    }
  }

  async performBundling(bundle) {
    this.logger.info('Trying to upload bundle...');
    const storagePeriods = this.strategy.storagePeriods();
    const result = await this.dataModelEngine.finaliseBundling(bundle, this.bundleSequenceNumber, storagePeriods);
    if (result !== null) {
      this.logger.info({message: 'Bundle successfully uploaded', bundleId: result.bundleId});
      await this.strategy.bundlingSucceeded();
      this.bundleSequenceNumber++;
    }
  }
}
