/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import healthCheckHandler from '../routes/health_check';
import PeriodicWorker from './periodic_worker';
import AtlasChallengeParticipationStrategy from './atlas_strategies/atlas_challenge_resolution_strategy';
import {checkIfEnoughFundsToPayForGas, getDefaultAddress} from '../utils/web3_tools';

const ATLAS_RESOLUTION_WORK_TYPE = 'AtlasChallengeResolution';

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
    serverPort
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
    this.isOutOfFunds = false;
    this.expressApp = express();
    this.serverPort = serverPort;
    this.expressApp.get('/health', asyncMiddleware(
      healthCheckHandler(mongoClient, web3)
    ));

    if (!(this.strategy instanceof AtlasChallengeParticipationStrategy)) {
      throw new Error('A valid strategy must be provided');
    }
  }

  async tryToResolve(bundle, {challengeId}) {
    await this.challengesRepository.resolveChallenge(challengeId);
    await this.dataModelEngine.updateShelteringExpirationDate(bundle.bundleId);
    await this.addLog('🍾 Yahoo! The bundle is ours.', {bundleId: bundle.bundleId});
  }

  async tryToDownload({sheltererId, bundleId, challengeId}) {
    await this.addLog(`Trying to fetch the bundle`, {sheltererId, bundleId, challengeId});
    return this.dataModelEngine.downloadBundle(bundleId, sheltererId);
  }

  async tryWithChallenge(challenge) {
    try {
      if (this.failedChallengesCache.didChallengeFailRecently(challenge.challengeId)) {
        return false;
      }
      if (!await this.strategy.shouldFetchBundle(challenge)) {
        await this.addLog('Decided not to download bundle', challenge);
        return false;
      }
      const bundle = await this.tryToDownload(challenge);
      if (!await this.strategy.shouldResolveChallenge(bundle)) {
        await this.addLog('Challenge resolution cancelled', challenge);
        return false;
      }
      await this.tryToResolve(bundle, challenge);
      await this.strategy.afterChallengeResolution(bundle);
      return true;
    } catch (err) {
      this.failedChallengesCache.rememberFailedChallenge(challenge.challengeId, this.strategy.retryTimeout);
      await this.addLog(`Failed to resolve challenge: ${err.message || err}`, challenge, err.stack);
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
      const challenges = await this.challengesRepository.ongoingChallenges();
      const recentlyFailedChallenges = challenges.filter(({challengeId}) => this.failedChallengesCache.failedChallengesEndTime.hasOwnProperty(challengeId);
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
