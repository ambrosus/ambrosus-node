/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';
import AtlasChallengeParticipationStrategy from './atlas_strategies/atlas_challenge_resolution_strategy';

export default class AtlasWorker extends PeriodicWorker {
  constructor(web3, dataModelEngine, challengesRepository, strategy, logger) {
    super(strategy.workerInterval, logger);
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.strategy = strategy;
    this.challengesRepository = challengesRepository;
    if (!(this.strategy instanceof AtlasChallengeParticipationStrategy)) {
      throw new Error('A valid strategy must be provided');
    }
  }

  async tryToResolve(bundle, {challengeId}) {
    try {
      await this.challengesRepository.resolveChallenge(challengeId);
    } catch (err) {
      await this.challengesRepository.markChallengeAsRejected(challengeId);
      throw err;
    }
    await this.dataModelEngine.updateShelteringExpirationDate(bundle.bundleId);
    this.logger.info({message: '🍾 Yahoo! The bundle is ours.', bundleId: bundle.bundleId});
  }

  async tryToDownload({sheltererId, bundleId, challengeId}) {
    this.logger.info({message: `Trying to fetch the bundle`, sheltererId, bundleId, challengeId});
    return this.dataModelEngine.downloadBundle(bundleId, sheltererId);
  }

  async periodicWork() {
    const challenges = await this.challengesRepository.ongoingChallenges();
    for (const challenge of challenges) {
      if (await this.challengesRepository.wasChallengeRejectedRecently(challenge.challengeId)) {
        continue;
      }
      try {
        if (!await this.strategy.shouldFetchBundle(challenge)) {
          this.logger.info({message: 'Decided not to download bundle', ...challenge});
          continue;
        }
        const bundle = await this.tryToDownload(challenge);
        if (!await this.strategy.shouldResolveChallenge(bundle)) {
          this.logger.info({message: 'Challenge resolution cancelled', ...challenge});
          await this.challengesRepository.markChallengeAsRejected(challenge.challengeId);
          continue;
        }
        await this.tryToResolve(bundle, challenge);
        await this.strategy.afterChallengeResolution(bundle);
      } catch (err) {
        this.logger.error({
          message: `Failed to resolve challenge: ${err.message}`,
          ...challenge
        });
      }
    }
    await this.dataModelEngine.cleanupBundles();
  }
}
