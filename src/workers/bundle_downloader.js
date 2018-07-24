/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';

export default class BundleDownloader extends PeriodicWorker {
  constructor(dataModelEngine, interval, logger) {
    super(interval, logger);
    this.dataModelEngine = dataModelEngine;
    this.proofRepository = dataModelEngine.proofRepository;
  }

  async beforeStart() {
    this.last = await this.proofRepository.getBundleCount();
  }

  async work() {
    return this.downloadAllNew();
  }

  async downloadAllNew() {
    const count = await this.proofRepository.getBundleCount();
    this.logger.info(`Found ${count - this.last} new bundles.`);
    for (let index = this.last; index < count; index++) {
      await this.downloadOne(index);
    }
    this.last = count;
  }

  async downloadOne(index) {
    const bundleId = await this.proofRepository.getBundleByIndex(index);
    const vendorId = (await this.proofRepository.getNodeForBundle(bundleId)).toLowerCase();
    const vendorUrl = await this.proofRepository.getVendorUrl(vendorId);
    this.logger.info(`Downloading bundle ${bundleId} (index: ${index}) for vendor: ${vendorId} from ${vendorUrl}...`);
    await this.dataModelEngine.downloadBundle(bundleId, vendorId);
    this.logger.info(`Bundle downloaded.`);
  }
}
