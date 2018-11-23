/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';
import AtlasChallengeParticipationStrategy from './atlas_strategies/atlas_challenge_resolution_strategy';
import {getTimestamp} from '../utils/time_utils';

export default class AtlasWorker extends PeriodicWorker {
  constructor(web3, dataModelEngine, workerLogRepository, challengesRepository, strategy, logger) {
    super(strategy.workerInterval, logger);
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.strategy = strategy;
    this.workerLogRepository = workerLogRepository;
    this.challengesRepository = challengesRepository;
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

  async periodicWork() {
    const challenges = await this.challengesRepository.ongoingChallenges();
    for (const challenge of challenges) {
      try {
        if (!await this.strategy.shouldFetchBundle(challenge)) {
          await this.addLog('Decided not to download bundle', challenge);
          continue;
        }
        const bundle = await this.tryToDownload(challenge);
        if (!await this.strategy.shouldResolveChallenge(bundle)) {
          await this.addLog('Challenge resolution cancelled', challenge);
          continue;
        }
        await this.tryToResolve(bundle, challenge);
        await this.strategy.afterChallengeResolution(bundle);
      } catch (err) {
        await this.addLog(`Failed to resolve challenge: ${err.message || err}`, challenge, err.stack);
      }
    }
    await this.dataModelEngine.cleanupBundles();
  }

  async addLog(message, additionalFields, stacktrace) {
    const log = {
      message,
      ...additionalFields
    };
    this.logger.info({...log, stacktrace});
    await this.workerLogRepository.storeLog({timestamp: getTimestamp(), ...log});
  }
}
