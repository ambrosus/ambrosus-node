/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import ResolutionsRepository from './resolutions_repository';

const SHELTERING_EVENT_ONE_FETCH_LIMIT = 250;

export default class ShelteredBundlesRepository extends ResolutionsRepository {
  constructor(address, bundleStoreWrapper, blockchainStateWrapper, activeBundlesCache, db, rolesEventEmitterWrapper) {
    super(blockchainStateWrapper, activeBundlesCache, SHELTERING_EVENT_ONE_FETCH_LIMIT);
    this.address = address;
    this.bundleStoreWrapper = bundleStoreWrapper;
    this.db = db;
    this.rolesEventEmitterWrapper = rolesEventEmitterWrapper;
  }

  async load(logger) {
    this.logger = logger;
    try {
      logger.info(`Loading blockchain sheltering state...`);
      const stored = await this.db.collection('resolutions_repository').findOne({name:'shelteredbundles'}, {projection: {_id: 0}});
      const cursor = await this.db.collection('blockchain_bundles').find({}, {projection: {_id: 0}});
      if (stored !== null && cursor !== null) {
        this.lastSavedBlock = stored.lastSavedBlock;
        const bundles = await cursor.toArray();
        this.activeResolutionsCache.setActiveResolutions(bundles);
        logger.info(`Blockchain sheltering state: LastBlock ${this.lastSavedBlock}, Loaded ${bundles.length} bundles`);
      } else {
        logger.info(`Blockchain sheltering state not found`);
      }
    } catch (err) {
      logger.info(`Failed to load sheltering state: ${err.message || err}`);
    }
  }

  async updateActiveResolutionsCache(fromBlock, currentBlock) {
    const addedBundles = await this.collectEvents(fromBlock, currentBlock,
      async (start, end) => (await this.bundleStoreWrapper.sheltererAdded(start, end)).filter((event) => event.returnValues.shelterer === this.address),
      ['bundleId', 'shelterer']);
    const removedBundles = await this.collectEvents(fromBlock, currentBlock,
      async (start, end) => (await this.bundleStoreWrapper.sheltererRemoved(start, end)).filter((event) => event.returnValues.shelterer === this.address),
      ['bundleId', 'shelterer']);

    this.activeResolutionsCache.applyIncomingResolutionEvents(addedBundles, [], removedBundles);
    try {
      await this.db.collection('resolutions_repository').updateOne({name:'shelteredbundles'}, {$set : {name:'shelteredbundles', lastSavedBlock: currentBlock}}, {upsert : true});
      if (addedBundles.length > 0) {
        for (const bundle of addedBundles) {
          await this.db.collection('blockchain_bundles').insertOne(bundle);
        }
        this.logger.info(`Blockchain sheltering state: Stored ${addedBundles.length} bundles`);
      }
      if (removedBundles.length > 0) {
        for (const bundle of removedBundles) {
          await this.db.collection('blockchain_bundles').deleteOne({bundleId: bundle.bundleId});
        }
        this.logger.info(`Blockchain sheltering state: Removed ${removedBundles.length} bundles`);
      }
    } catch (err) {
      this.logger.info(`Failed to store sheltering state: ${err.message || err}`);
    }
  }

  async getFromBlock() {
    if (this.lastSavedBlock > 0) {
      return this.lastSavedBlock + 1;
    }
    return await this.getOnboardBlock();
  }

  async getOnboardBlock() {
    let to = await this.blockchainStateWrapper.getCurrentBlockNumber();
    const blocks = 100000;

    while (to > 0) {
      let from = to - blocks + 1;
      if (from < 0) {
        from = 0;
      }
      const onboarded = (await this.rolesEventEmitterWrapper.nodeOnboardings(from, to)).filter((event) => event.returnValues.nodeAddress === this.address);
      if (onboarded.length > 0) {
        this.logger.info(`Onboarded at block number ${onboarded[onboarded.length - 1].blockNumber}`);
        return onboarded[onboarded.length - 1].blockNumber;
      }
      to = from - 1;
    }

    return 0;
  }
}
