/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';
import HermesUploadStrategy from './hermes_strategies/upload_strategy';

export default class HermesWorker extends PeriodicWorker {
  constructor(dataModelEngine, uploadRepository, strategy, retryPeriod, logger) {
    super(strategy.workerInterval, logger);
    this.dataModelEngine = dataModelEngine;
    this.bundleSequenceNumber = 0;
    this.strategy = strategy;
    this.uploadRepository = uploadRepository;
    this.retryPeriod = retryPeriod;
    this.sinceLastRetry = retryPeriod;
    if (!(this.strategy instanceof HermesUploadStrategy)) {
      throw new Error('A valid strategy must be provided');
    }
  }

  async retryUploadIfNecessary() {
    this.sinceLastRetry++;
    if (this.sinceLastRetry >= this.retryPeriod) {
      const uploaded = await this.dataModelEngine.uploadNotRegisteredBundles();
      if (uploaded.length > 0) {
        this.logger.info(`Uploaded ${uploaded.length} not registered bundles`);
      }
      this.sinceLastRetry = 0;
    }
  }

  async periodicWork() {
    const storagePeriods = this.strategy.storagePeriods();
    if (!await this.uploadRepository.checkIfEnoughFundsForUpload(storagePeriods)) {
      this.logger.error('Insufficient funds to perform bundle upload.');
      return;
    }
    await this.retryUploadIfNecessary();

    const bundleItemsCountLimit = await this.uploadRepository.bundleItemsCountLimit();
    const bundle = await this.dataModelEngine.initialiseBundling(this.bundleSequenceNumber, bundleItemsCountLimit);

    if (await this.strategy.shouldBundle(bundle)) {
      await this.performBundling(bundle, storagePeriods);
    } else {
      await this.dataModelEngine.cancelBundling(this.bundleSequenceNumber);
      this.logger.info('Bundling process canceled');
    }
  }

  async performBundling(bundle, storagePeriods) {
    this.logger.info('Trying to upload bundle...');
    const result = await this.dataModelEngine.finaliseBundling(bundle, this.bundleSequenceNumber, storagePeriods);
    if (result !== null) {
      this.logger.info({message: 'Bundle successfully uploaded', bundleId: result.bundleId});
      await this.strategy.bundlingSucceeded();
      this.bundleSequenceNumber++;
    }
  }
}
