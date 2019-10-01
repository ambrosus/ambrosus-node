/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class BundlesRestorer {
  constructor(bundleStoreWrapper, shelteringWrapper, dataModelEngine, bundleRepository, shelteredBundlesRepository, workerLogger) {
    this.bundleStoreWrapper = bundleStoreWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.dataModelEngine = dataModelEngine;
    this.bundleRepository = bundleRepository;
    this.shelteredBundlesRepository = shelteredBundlesRepository;
    this.workerLogger = workerLogger;
  }

  async restore() {
    const storedBundles = await this.bundleRepository.getShelteredBundles(0);
    const storedBundlesIds = new Set(storedBundles.map((bundle) => bundle.bundleId));
    const bundles = (await this.shelteredBundlesRepository.ongoingResolutions()).filter((bundle) => !storedBundlesIds.has(bundle.bundleId));

    for (const bundle of bundles) {
      try {
        await this.workerLogger.addLog('Try to restore bundle', bundle.bundleId);
        const expirationTime = await this.shelteringWrapper.getShelteringExpirationDate(bundle.bundleId, bundle.shelterer);
        const donors = await this.getBundleDonors(bundle);
        while (donors.length > 0) {
          const pos = this.getRandomInt(donors.length);
          const donorId = donors[pos];
          try {
            await this.dataModelEngine.downloadBundle(bundle.bundleId, donorId, expirationTime);
            await this.dataModelEngine.markBundleAsSheltered(bundle.bundleId);
            await this.workerLogger.addLog('Bundle restored', bundle.bundleId);
            break;
          } catch (err) {
            await this.workerLogger.logger.info(`Failed to download bundle: ${err.message || err}`, {bundleId: bundle.bundleId, donorId}, err.stack);
            donors.splice(pos, 1);
          }
        }
      } catch (err) {
        await this.workerLogger.addLog(`Failed to restore bundle: ${err.message || err}`, bundle.bundleId, err.stack);
      }
    }
  }

  getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  async getBundleDonors(bundle) {
    const contract = await this.bundleStoreWrapper.contract();
    const shelterers = await contract.methods.getShelterers(bundle.bundleId).call();
    let pos = shelterers.indexOf(bundle.shelterer);
    while (-1 !== pos) {
      shelterers.splice(pos, 1);
      pos = shelterers.indexOf(bundle.shelterer);
    }
    shelterers.push(await contract.methods.getUploader(bundle.bundleId).call());
    return shelterers;
  }
}

