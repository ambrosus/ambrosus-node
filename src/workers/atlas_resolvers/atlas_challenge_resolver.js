/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import promClient from 'prom-client';
import AtlasParticipationStrategy from '../atlas_strategies/atlas_participation_strategy';
import {AtlasResolver, atlasResolutionStatus} from './atlas_resolver';
import {getDefaultAddress} from '../../utils/web3_tools';

export default class AtlasChallengeResolver extends AtlasResolver {
  constructor(
    web3,
    dataModelEngine,
    challengesRepository,
    failedChallengesCache,
    strategy,
    workerLogRepository,
    logger
  ) {
    super();
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.strategy = strategy;
    this.challengesRepository = challengesRepository;
    this.failedChallengesCache = failedChallengesCache;
    this.workerLogRepository = workerLogRepository;
    this.logger = logger;

    if (!(this.strategy instanceof AtlasParticipationStrategy)) {
      throw new Error('A valid challenge strategy must be provided');
    }
  }

  async tryToResolve({bundleId}, {challengeId}) {
    await this.challengesRepository.resolveChallenge(challengeId);
    await this.dataModelEngine.markBundleAsSheltered(bundleId);
    await this.addLog('🍾 Yahoo! The bundle is ours.', {bundleId});
  }

  async tryToDownload({sheltererId, bundleId, challengeId}) {
    const challengeExpirationTime = await this.challengesRepository.getChallengeExpirationTimeInMs(challengeId);
    const metadata = await this.dataModelEngine.downloadBundle(bundleId, sheltererId, challengeExpirationTime);
    await this.addLog(`Bundle fetched`, {sheltererId, bundleId, challengeId});
    return metadata;
  }

  async isTurnToResolve({challengeId}) {
    const currentResolver = await this.challengesRepository.getChallengeDesignatedShelterer(challengeId);
    return (currentResolver === getDefaultAddress(this.web3));
  }

  async tryWithChallenge(challenge) {
    try {
      if (this.failedChallengesCache.didResolutionFailRecently(challenge.challengeId)) {
        return false;
      }
      if (!await this.isTurnToResolve(challenge)) {
        this.atlasChallengeMetrics.inc({status: atlasResolutionStatus.shouldNotResolve});
        await this.addLog(`Not the node's turn to resolve`, challenge);
        return false;
      }

      if (!await this.strategy.shouldFetchBundle(challenge)) {
        this.atlasChallengeMetrics.inc({status: atlasResolutionStatus.shouldNotFetch});
        await this.addLog('Decided not to download bundle', challenge);
        return false;
      }

      const bundleMetadata = await this.tryToDownload(challenge);
      if (!await this.strategy.shouldResolve(bundleMetadata)) {
        this.atlasChallengeMetrics.inc({status: atlasResolutionStatus.shouldNotResolve});
        await this.addLog('Challenge resolution cancelled', challenge);
        return false;
      }

      await this.tryToResolve(bundleMetadata, challenge);
      await this.strategy.afterResolution(challenge);
      this.atlasChallengeMetrics.inc({status: atlasResolutionStatus.resolved});
      return true;
    } catch (err) {
      this.failedChallengesCache.rememberFailedResolution(challenge.challengeId, this.strategy.retryTimeout);
      await this.addLog(`Failed to resolve challenge: ${err.message || err}`, challenge, err.stack);
      this.atlasChallengeMetrics.inc({status: atlasResolutionStatus.failed});
      return false;
    }
  }

  async addLog(message, additionalFields, stacktrace) {
    const log = {
      message,
      ...additionalFields
    };
    this.logger.info({...log, stacktrace});
    await this.workerLogRepository.storeLog({timestamp: new Date(), ...log});
  }

  addMetrics(registry) {
    this.atlasChallengeMetrics = new promClient.Counter({
      name: 'atlas_challenges_total',
      help: `Total number of challenges. Status label is one of [${Object.values(atlasResolutionStatus)}]`,
      labelNames: ['status'],
      registers: [registry]
    });
  }

  async resolve(entity) {
    return await this.tryWithChallenge(entity);
  }

  async resolveOne() {
    const challenges = await this.challengesRepository.ongoingResolutions();
    const recentlyFailedChallenges = challenges.filter(({challengeId}) => challengeId in this.failedChallengesCache.failedResolutionsEndTime);
    await this.addLog(`Challenges preselected for resolution: ${challenges.length} (out of which ${recentlyFailedChallenges.length} have failed recently)`);
    for (const challenge of challenges) {
      const successful = await this.tryWithChallenge(challenge);
      if (successful) {
        break;
      }
    }
    this.failedChallengesCache.clearOutdatedResolutions();
  }

  async resolveAll() {
    const challenges = await this.challengesRepository.ongoingResolutions();
    const recentlyFailedChallenges = challenges.filter(({challengeId}) => challengeId in this.failedChallengesCache.failedResolutionsEndTime);
    await this.addLog(`Challenges preselected for resolution: ${challenges.length} (out of which ${recentlyFailedChallenges.length} have failed recently)`);
    for (const challenge of challenges) {
      await this.tryWithChallenge(challenge);
    }
    this.failedChallengesCache.clearOutdatedResolutions();
  }
}
