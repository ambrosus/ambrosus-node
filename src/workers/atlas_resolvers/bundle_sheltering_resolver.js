/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import AtlasParticipationStrategy from '../atlas_strategies/atlas_participation_strategy';
import {AtlasResolver, atlasResolutionStatus} from './atlas_resolver';
import {getDefaultAddress} from '../../utils/web3_tools';

/**
 * Contains common resolution logic
 * @abstract
 */
export default class BundleShelteringResolver extends AtlasResolver {
  /**
   * @param {Web3} web3 - the web3 blockchain library
   * @param {DataModelEngine} dataModelEngine - the utility to handle data operations
   * @param {ResolutionsRepository} resolutionsRepository - the resolution events storage
   * @param {FailedResolutionsCache} failedResolutionsCache - the utility to remember failed resolutions
   * @param {AtlasParticipationStrategy} strategy - the resolution strategy
   * @param {WorkerLogger} workerLogger - the logging utility
   * @param {string} propositionName - the resolvers name
   */
  constructor(
    web3,
    dataModelEngine,
    resolutionsRepository,
    failedResolutionsCache,
    strategy,
    workerLogger,
    propositionName
  ) {
    super();
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.strategy = strategy;
    this.resolutionsRepository = resolutionsRepository;
    this.failedResolutionsCache = failedResolutionsCache;
    this.workerLogger = workerLogger;
    this.propositionName = propositionName;

    if (!(this.strategy instanceof AtlasParticipationStrategy)) {
      throw new Error('A valid strategy must be provided');
    }
  }

  /**
   * @abstract
   * Should return event's id
   * @param proposition
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPropositionId(proposition) {
    throw new Error('Should be implemented');
  }

  /**
   * @abstract
   * Should return sheltered Bundle's id
   * @param proposition
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getSheltererId(proposition) {
    throw new Error('Should be implemented');
  }

  /**
   * Tries to resolve event. For internal usage
   * @param {number} bundleId
   * @param proposition
   * @returns {Promise<void>}
   */
  async tryToResolve(bundleId, proposition) {
    await this.resolutionsRepository.resolve(proposition);
    await this.dataModelEngine.markBundleAsSheltered(bundleId);
    await this.workerLogger.addLog('🍾 Yahoo! The bundle is ours.', {bundleId});
  }

  /**
   * Tries to download Bundle
   * @param proposition
   * @returns {Promise<*>}
   */
  async tryToDownload(proposition) {
    const propositionExpirationTime = await this.resolutionsRepository.getExpirationTimeInMs(proposition);
    const metadata = await this.dataModelEngine.downloadBundle(proposition.bundleId, this.getSheltererId(proposition), propositionExpirationTime);
    await this.workerLogger.addLog('Bundle fetched', proposition);
    return metadata;
  }

  /**
   * Tells is other Atlas instance available
   * @param proposition
   * @returns {Promise<boolean>}
   */
  async isTurnToResolve(proposition) {
    const currentResolver = await this.resolutionsRepository.getDesignatedShelterer(proposition);
    return (currentResolver === getDefaultAddress(this.web3));
  }

  /**
   * Tries to resolve event. Saves failed to cache and retries them. For internal usage
   * @param proposition
   * @returns {Promise<boolean>}
   */
  async tryWith(proposition) {
    try {
      if (this.failedResolutionsCache.didResolutionFailRecently(this.getPropositionId(proposition))) {
        return false;
      }
      if (!await this.isTurnToResolve(proposition)) {
        this.atlasResolverMetrics.inc({status: atlasResolutionStatus.shouldNotResolve});
        // await this.workerLogger.logger.info(`Not the node's turn to resolve`, proposition);
        return false;
      }

      if (!await this.strategy.shouldFetchBundle(proposition)) {
        this.atlasResolverMetrics.inc({status: atlasResolutionStatus.shouldNotFetch});
        await this.workerLogger.logger.info('Decided not to download bundle', proposition);
        return false;
      }

      const bundleMetadata = await this.tryToDownload(proposition);
      if (!await this.strategy.shouldResolve(bundleMetadata)) {
        this.atlasResolverMetrics.inc({status: atlasResolutionStatus.shouldNotResolve});
        await this.workerLogger.logger.info('${this.propositionName} resolution cancelled', proposition);
        return false;
      }

      await this.tryToResolve(bundleMetadata.bundleId, proposition);
      await this.strategy.afterResolution(proposition);
      this.atlasResolverMetrics.inc({status: atlasResolutionStatus.resolved});
      return true;
    } catch (err) {
      this.failedResolutionsCache.rememberFailedResolution(this.getPropositionId(proposition), this.strategy.retryTimeout);
      await this.workerLogger.addLog(`Failed to resolve: ${err.message || err}`, proposition, err.stack);
      this.atlasResolverMetrics.inc({status: atlasResolutionStatus.failed});
      return false;
    }
  }

  /**
   * Overwritten method of AtlasResolver abstract class
   * @param proposition
   * @returns {Promise<boolean>}
   */
  async resolve(proposition) {
    return await this.tryWith(proposition);
  }

  /**
   * Overwritten method of AtlasResolver abstract class
   * @returns {Promise<void>}
   */
  async resolveOne() {
    const resolutions = await this.resolutionsRepository.ongoingResolutions();
    const recentlyFailedResolutions = resolutions.filter((proposition) => this.getPropositionId(proposition) in this.failedResolutionsCache.failedResolutionsEndTime);
    await this.workerLogger.logger.info(`${this.propositionName}s preselected for resolution: ${resolutions.length} (out of which ${recentlyFailedResolutions.length} have failed recently)`);
    for (const resolution of resolutions) {
      const successful = await this.resolve(resolution);
      if (successful) {
        break;
      }
    }
    this.failedResolutionsCache.clearOutdatedResolutions();
  }

  /**
   * Overwritten method of AtlasResolver abstract class
   * @returns {Promise<void>}
   */
  async resolveAll() {
    const resolutions = await this.resolutionsRepository.ongoingResolutions();
    const recentlyFailedResolutions = resolutions.filter((proposition) => this.getPropositionId(proposition) in this.failedResolutionsCache.failedResolutionsEndTime);
    await this.workerLogger.logger.info(`${this.propositionName}s preselected for resolution: ${resolutions.length} (out of which ${recentlyFailedResolutions.length} have failed recently)`);
    for (const resolution of resolutions) {
      await this.resolve(resolution);
    }
    this.failedResolutionsCache.clearOutdatedResolutions();
  }
}
