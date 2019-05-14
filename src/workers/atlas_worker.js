/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import promClient from 'prom-client';
import prometheusMetricsHandler from '../routes/prometheus_metrics.js';
import asyncMiddleware from '../middlewares/async_middleware';
import healthCheckHandler from '../routes/health_check';
import PeriodicWorker from './periodic_worker';
import AtlasChallengeParticipationStrategy from './atlas_strategies/atlas_challenge_resolution_strategy';
import {checkIfEnoughFundsToPayForGas, getDefaultAddress} from '../utils/web3_tools';
import availableDiskSpace from '../utils/disk_usage';

const ATLAS_RESOLUTION_WORK_TYPE = 'AtlasChallengeResolution';
const atlasChallengeStatus = {
  resolved: 'resolved',
  failed: 'failed',
  shouldNotFetch: 'should_not_fetch',
  shouldNotResolve: 'should_not_resolve'
};

export default class AtlasWorker extends PeriodicWorker {
  constructor(
    web3,
    dataModelEngine,
    workerLogRepository,
    challengesRepository,
    workerTaskTrackingRepository,
    failedChallengesCache,
    strategy,
    logger,
    mongoClient,
    serverPort,
    requiredFreeDiskSpace
  ) {
    super(strategy.workerInterval, logger);
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.strategy = strategy;
    this.workerLogRepository = workerLogRepository;
    this.challengesRepository = challengesRepository;
    this.workerTaskTrackingRepository = workerTaskTrackingRepository;
    this.failedChallengesCache = failedChallengesCache;
    this.mongoClient = mongoClient;
    this.requiredFreeDiskSpace = requiredFreeDiskSpace;
    this.isOutOfFunds = false;
    this.isOutOfSpace = false;
    this.expressApp = express();
    this.serverPort = serverPort;
    this.expressApp.get('/health', asyncMiddleware(
      healthCheckHandler(mongoClient, web3)
    ));
    const registry = new promClient.Registry();
    this.expressApp.get('/metrics', prometheusMetricsHandler(registry));
    this.atlasChallengeMetrics = new promClient.Counter({
      name: 'atlas_challenges_total',
      help: `Total number of challenges. Status label is one of [${Object.values(atlasChallengeStatus)}]`,
      labelNames: ['status'],
      registers: [registry]
    });

    if (!(this.strategy instanceof AtlasChallengeParticipationStrategy)) {
      throw new Error('A valid strategy must be provided');
    }
  }

  async tryToResolve({bundleId}, {challengeId}) {
    await this.challengesRepository.resolveChallenge(challengeId);
    await this.dataModelEngine.markBundleAsSheltered(bundleId);
    await this.addLog('🍾 Yahoo! The bundle is ours.', {bundleId});
  }

  async tryToDownload({sheltererId, bundleId, challengeId}) {
    const metadata = await this.dataModelEngine.downloadBundle(bundleId, sheltererId);
    await this.addLog(`Bundle fetched`, {sheltererId, bundleId, challengeId});
    return metadata;
  }

  async isTurnToResolve({challengeId}) {
    const currentResolver = await this.challengesRepository.getChallengeDesignatedShelterer(challengeId);
    return (currentResolver === getDefaultAddress(this.web3));
  }

  async tryWithChallenge(challenge) {
    try {
      if (this.failedChallengesCache.didChallengeFailRecently(challenge.challengeId)) {
        return false;
      }
      if (!await this.strategy.shouldFetchBundle(challenge)) {
        this.atlasChallengeMetrics.inc({status: atlasChallengeStatus.shouldNotFetch});
        await this.addLog('Decided not to download bundle', challenge);
        return false;
      }
      const bundleMetadata = await this.tryToDownload(challenge);
      if (!await this.strategy.shouldResolveChallenge(bundleMetadata)) {
        this.atlasChallengeMetrics.inc({status: atlasChallengeStatus.shouldNotResolve});
        await this.addLog('Challenge resolution cancelled', challenge);
        return false;
      }

      if (!await this.isTurnToResolve(challenge)) {
        this.atlasChallengeMetrics.inc({status: atlasChallengeStatus.shouldNotResolve});
        await this.addLog(`Not the node's turn to resolve`, challenge);
        return false;
      }

      await this.tryToResolve(bundleMetadata, challenge);
      await this.strategy.afterChallengeResolution(challenge);
      this.atlasChallengeMetrics.inc({status: atlasChallengeStatus.resolved});
      return true;
    } catch (err) {
      this.failedChallengesCache.rememberFailedChallenge(challenge.challengeId, this.strategy.retryTimeout);
      await this.addLog(`Failed to resolve challenge: ${err.message || err}`, challenge, err.stack);
      this.atlasChallengeMetrics.inc({status: atlasChallengeStatus.failed});
      return false;
    }
  }

  async periodicWork() {
    let workId = null;
    try {
      workId = await this.workerTaskTrackingRepository.tryToBeginWork(ATLAS_RESOLUTION_WORK_TYPE);
    } catch (err) {
      return;
    }
    try {
      if (!await this.isEnoughFundsToPayForGas()) {
        return;
      }
      if (!await this.isEnoughAvailableDiskSpace()) {
        return;
      }
      const challenges = await this.challengesRepository.ongoingChallenges();
      const recentlyFailedChallenges = challenges.filter(({challengeId}) => challengeId in this.failedChallengesCache.failedChallengesEndTime);
      await this.addLog(`Challenges preselected for resolution: ${challenges.length} (out of which ${recentlyFailedChallenges.length} have failed recently)`);

      for (const challenge of challenges) {
        const successful = await this.tryWithChallenge(challenge);
        if (successful) {
          break;
        }
      }
      this.failedChallengesCache.clearOutdatedChallenges();
    } finally {
      await this.workerTaskTrackingRepository.finishWork(workId);
    }
  }

  async isEnoughFundsToPayForGas() {
    if (!await checkIfEnoughFundsToPayForGas(this.web3, getDefaultAddress(this.web3))) {
      if (!this.isOutOfFunds) {
        await this.addLog('Not enough funds to pay for gas');
        this.isOutOfFunds = true;
      }
      return false;
    }
    this.isOutOfFunds = false;
    return true;
  }

  async isEnoughAvailableDiskSpace() {
    if (await availableDiskSpace() < this.requiredFreeDiskSpace) {
      if (!this.isOutOfSpace) {
        await this.addLog('Not enough free disk space');
        this.isOutOfSpace = true;
      }
      return false;
    }
    this.isOutOfSpace = false;
    return true;
  }

  async addLog(message, additionalFields, stacktrace) {
    const log = {
      message,
      ...additionalFields
    };
    this.logger.info({...log, stacktrace});
    await this.workerLogRepository.storeLog({timestamp: new Date(), ...log});
  }

  beforeWorkLoop() {
    this.server = this.expressApp.listen(this.serverPort);
  }

  async afterWorkLoop() {
    await this.server.close();
    await this.mongoClient.close();
  }
}
