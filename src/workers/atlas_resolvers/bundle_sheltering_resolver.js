/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import AtlasParticipationStrategy from '../atlas_strategies/atlas_participation_strategy';
import {AtlasResolver, atlasResolutionStatus} from './atlas_resolver';
import {getDefaultAddress} from '../../utils/web3_tools';

export default class BundleShelteringResolver extends AtlasResolver {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPropositionId(proposition) {
    throw new Error('Should be implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getSheltererId(proposition) {
    throw new Error('Should be implemented');
  }

  async tryToResolve(bundleId, proposition) {
    await this.resolutionsRepository.resolve(proposition);
    await this.dataModelEngine.markBundleAsSheltered(bundleId);
    await this.workerLogger.addLog('🍾 Yahoo! The bundle is ours.', {bundleId});
  }

  async tryToDownload(proposition) {
    const propositionExpirationTime = await this.resolutionsRepository.getExpirationTimeInMs(proposition);
    const metadata = await this.dataModelEngine.downloadBundle(proposition.bundleId, this.getSheltererId(proposition), propositionExpirationTime);
    await this.workerLogger.addLog('Bundle fetched', proposition);
    return metadata;
  }

  async isTurnToResolve(proposition) {
    const currentResolver = await this.resolutionsRepository.getDesignatedShelterer(proposition);
    return (currentResolver === getDefaultAddress(this.web3));
  }

  async tryWith(proposition) {
    try {
      if (this.failedResolutionsCache.didResolutionFailRecently(this.getPropositionId(proposition))) {
        return false;
      }
      if (!await this.isTurnToResolve(proposition)) {
        this.atlasResolverMetrics.inc({status: atlasResolutionStatus.shouldNotResolve});
        await this.workerLogger.logger.info(`Not the node's turn to resolve`, proposition);
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

  async resolve(proposition) {
    return await this.tryWith(proposition);
  }

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
