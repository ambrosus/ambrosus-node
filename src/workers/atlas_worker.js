/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';
import ChallengeResolutionStrategy from './atlas_strategies/challenge_resolution_strategy';

export default class AtlasWorker extends PeriodicWorker {
  constructor(web3, dataModelEngine, challengesRepository, strategy, logger) {
    super(strategy.challengePullingInterval, logger);
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.strategy = strategy;
    this.challengesRepository = challengesRepository;
    if (!(this.strategy instanceof ChallengeResolutionStrategy)) {
      throw new Error('A valid strategy must be provided');
    }
  }

  async resolve(bundle, challengeId) {
    if (await this.strategy.shouldResolveChallenge(bundle)) {
      await this.challengesRepository.resolveChallenge(challengeId);
      await this.strategy.afterChallengeResolution(bundle);
      this.logger.info({message: '🍾 Yahoo! The bundle is ours.', bundleId: bundle.bundleId});
    } else {
      this.logger.info({message: 'Challenge resolution cancelled', challengeId});
    }
  }

  async tryToResolve({sheltererId, bundleId, challengeId}) {
    if (await this.strategy.shouldFetchBundle({sheltererId, bundleId, challengeId})) {
      this.logger.info({message: `Trying to fetch the bundle`, sheltererId, bundleId, challengeId});
      const bundle = await this.dataModelEngine.downloadBundle(bundleId, sheltererId);
      await this.resolve(bundle, challengeId);
    } else {
      this.logger.info({message: 'Decided not to download bundle', sheltererId, bundleId, challengeId});
    }
  }

  async periodicWork() {
    const challenges = await this.challengesRepository.ongoingChallenges();
    for (const challenge of challenges) {
      try {
        await this.tryToResolve(challenge);
      } catch (err) {
        this.logger.error({
          message: `Failed to resolve challenge: ${err.message}`,
          ...challenge
        });
      }
    }
  }
}
