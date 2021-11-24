/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/**
 * The utility to restore Bundles from blockchain
 */
export default class BundlesRestorer {
  /**
   * @param {BundleStoreWrapper} bundleStoreWrapper - the wrapper around smart contract from ambrosus-node-contracts
   * @param {ShelteringWrapper}shelteringWrapper - the wrapper around smart contract from ambrosus-node-contracts
   * @param {ShelteringTransfersWrapper} shelteringTransfersWrapper - the wrapper around smart contract from ambrosus-node-contracts
   * @param {DataModelEngine} dataModelEngine - the utility to safely handle data operations
   * @param {BundleRepository} bundleRepository - the utility to handle local Bundle storage
   * @param {ShelteredBundlesRepository} shelteredBundlesRepository - the utility to handle Bundle stored in blockchain
   * @param {WorkerLogger} workerLogger - the logging utility
   */
  constructor(bundleStoreWrapper, shelteringWrapper, shelteringTransfersWrapper, dataModelEngine, bundleRepository, shelteredBundlesRepository, workerLogger) {
    this.bundleStoreWrapper = bundleStoreWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.shelteringTransfersWrapper = shelteringTransfersWrapper;
    this.dataModelEngine = dataModelEngine;
    this.bundleRepository = bundleRepository;
    this.shelteredBundlesRepository = shelteredBundlesRepository;
    this.workerLogger = workerLogger;
  }

  /**
   * Restores Bundles from blockchain
   * @returns {Promise<void>}
   */
  async restore() {
    await this.shelteredBundlesRepository.load(this.workerLogger.logger);
    await this.workerLogger.addLog('Getting sheltered bundles from DB...');
    const storedBundles = await this.bundleRepository.getShelteredBundles(0);
    await this.workerLogger.addLog(`Found ${storedBundles.length} bundles into DB`);
    const storedBundlesIds = new Set(storedBundles.map((bundle) => bundle.bundleId));
    await this.workerLogger.addLog('Getting sheltered bundles from blockchain...');
    const blockchainBundles = await this.shelteredBundlesRepository.ongoingResolutions();
    await this.workerLogger.addLog(`Found ${blockchainBundles.length} bundles into blockchain`);
    const bundles = blockchainBundles.filter((bundle) => !storedBundlesIds.has(bundle.bundleId));

    if (bundles.length > 0) {
      let restored = 0;
      await this.workerLogger.addLog(`Need to restore ${bundles.length} bundles`);
      for (const bundle of bundles) {
        try {
          if ((await this.shelteringWrapper.isSheltering(bundle.bundleId)) === false) {
            const transferId = await this.shelteringTransfersWrapper.getTransferId(bundle.shelterer, bundle.bundleId);
            if (await this.shelteringTransfersWrapper.isInProgress(transferId)) {
              await this.shelteringTransfersWrapper.cancel(transferId);
            }
            continue;
          }
          await this.workerLogger.addLog('Try to restore bundle', {bundleId: bundle.bundleId});
          const expirationTime = await this.shelteringWrapper.shelteringExpirationDate(bundle.bundleId);
          const donors = await this.getBundleDonors(bundle);
          while (donors.length > 0) {
            const pos = this.getRandomInt(donors.length);
            const donorId = donors[pos];
            try {
              await this.dataModelEngine.downloadBundle(bundle.bundleId, donorId, expirationTime);
              await this.dataModelEngine.markBundleAsSheltered(bundle.bundleId);
              await this.workerLogger.addLog('Bundle restored', {bundleId: bundle.bundleId});
              restored++;
              break;
            } catch (err) {
              this.workerLogger.logger.info(`Failed to download bundle: ${err.message || err}`, {bundleId: bundle.bundleId, donorId}, err.stack);
              donors.splice(pos, 1);
            }
          }
        } catch (err) {
          await this.workerLogger.addLog(`Failed to restore bundle: ${err.message || err}`, {bundleId: bundle.bundleId}, err.stack);
        }
      }
      await this.workerLogger.addLog(`Restored ${restored} bundles`);
    } else {
      await this.workerLogger.addLog(`All ${storedBundles.length} bundles are present in DB`);
    }
  }

  /**
   * Generates random number
   * @param {number} max - the maximum value
   * @returns {number}
   */
  getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  /**
   * Gets sheltered Bundles from blockchain to help restore them
   * @param {Object} bundle - the Bundle object
   * @returns {Promise<Iterable>}
   */
  async getBundleDonors(bundle) {
    const shelterers = await this.bundleStoreWrapper.getShelterers(bundle.bundleId);
    let pos = shelterers.indexOf(bundle.shelterer);
    while (-1 !== pos) {
      shelterers.splice(pos, 1);
      pos = shelterers.indexOf(bundle.shelterer);
    }
    shelterers.push(await this.bundleStoreWrapper.getUploader(bundle.bundleId));
    return shelterers;
  }
}

