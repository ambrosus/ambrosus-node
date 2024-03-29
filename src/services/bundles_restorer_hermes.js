/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class BundlesRestorerHermes {
  constructor(
    bundleStoreWrapper,
    dataModelEngine,
    bundleRepository,
    assetRepository,
    eventRepository,
    hermesBundlesRepository,
    shelteringWrapper,
    shelteringTransfersWrapper,
    workerLogger
  ) {
    this.bundleStoreWrapper = bundleStoreWrapper;
    this.dataModelEngine = dataModelEngine;
    this.bundleRepository = bundleRepository;
    this.assetRepository = assetRepository;
    this.eventRepository = eventRepository;
    this.hermesBundlesRepository = hermesBundlesRepository;
    this.shelteringWrapper = shelteringWrapper;
    this.workerLogger = workerLogger;
    this.shelteringTransfersWrapper = shelteringTransfersWrapper;
  }

  async parseAsset(asset, metadata) {
    asset.metadata = metadata;

    await this.assetRepository.storeAsset(asset);

    // console.log(`parseAsset(${asset.assetId}): ${JSON.stringify(asset)}`);
  }

  async parseEvent(event, metadata) {
    event.metadata = metadata;

    await this.eventRepository.storeEvent(event);

    // console.log(`parseEvent(${event.eventId}): ${JSON.stringify(event)}`);
  }

  async parseBundle(bundle) {
    await this.hermesBundlesRepository.delete(bundle.bundleId);

    if (await this.bundleRepository.isBundleStored(bundle.bundleId)) {
      // await this.workerLogger.addLog(`parseBundle(${bundle.bundleId}): already stored.`);

      return;
    }

    // console.log(`parseBundle(metadata): ${JSON.stringify(bundle.metadata)}`);

    await this.bundleRepository.storeBundle(bundle);

    for (const entry of bundle.content.entries) {
      if (entry.assetId !== undefined) {
        await this.parseAsset(entry, bundle.metadata);

        continue;
      }

      if (entry.eventId !== undefined) {
        await this.parseEvent(entry, bundle.metadata);

        continue;
      }

      await this.workerLogger.addLog(`parseBundle(${bundle.bundleId}): unknown entry type`);
    }
  }

  async restore() {
    await this.hermesBundlesRepository.load(this.workerLogger.logger);

    await this.workerLogger.addLog('Getting sheltered bundles from DB...');
    const storedBundles = await this.bundleRepository.getHermesBundles(0);
    await this.workerLogger.addLog(`Found ${storedBundles.length} bundles into DB`);
    const storedBundlesIds = new Set(storedBundles.map((bundle) => bundle.bundleId));
    await this.workerLogger.addLog('Getting sheltered bundles from blockchain...');
    const blockchainBundles = await this.hermesBundlesRepository.ongoingResolutions();
    await this.workerLogger.addLog(`Found ${blockchainBundles.length} bundles into blockchain`);
    const bundles = blockchainBundles.filter((bundle) => !storedBundlesIds.has(bundle.bundleId));

    if (bundles.length > 0) {
      let restored = 0;
      await this.workerLogger.addLog(`Need to restore ${bundles.length} bundles`);

      for (const bundle of bundles) {
        try {
          await this.workerLogger.addLog('Try to restore bundle', {bundleId: bundle.bundleId});
          const expirationTime = await this.shelteringWrapper.shelteringExpirationDate(bundle.bundleId);
          const donors = await this.getBundleDonors(bundle);
          if (donors.length === 0) {
            await this.workerLogger.addLog(`Bundle ${bundle.bundleId} has no donors`);
            continue;
          }

          while (donors.length > 0) {
            const pos = this.getRandomInt(donors.length);
            const donorId = donors[pos];

            try {
              const bundleBody = await this.dataModelEngine.downloadBundleHermes(bundle.bundleId, donorId, expirationTime);

              await this.parseBundle(bundleBody);

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

  getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  async getBundleDonors(bundle) {
    const shelterers = await this.bundleStoreWrapper.getShelterers(bundle.bundleId);
    let pos = shelterers.indexOf(bundle.shelterer);

    while (-1 !== pos) {
      shelterers.splice(pos, 1);
      pos = shelterers.indexOf(bundle.shelterer);
    }

    return shelterers;
  }
}

