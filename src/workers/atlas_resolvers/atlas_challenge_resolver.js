/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import promClient from 'prom-client';
import BundleShelteringResolver from './bundle_sheltering_resolver';
import {atlasResolutionStatus} from './atlas_resolver';

export default class AtlasChallengeResolver extends BundleShelteringResolver {
  constructor(
    web3,
    dataModelEngine,
    challengesRepository,
    failedChallengesCache,
    strategy,
    workerLogRepository,
    logger
  ) {
    super(web3,
      dataModelEngine,
      challengesRepository,
      failedChallengesCache,
      strategy,
      workerLogRepository,
      logger,
      'Challenge'
    );
  }

  getPropositionId(challenge) {
    return challenge.challengeId;
  }

  getSheltererId(challenge) {
    return challenge.sheltererId;
  }

  addMetrics(registry) {
    this.atlasResolverMetrics = new promClient.Counter({
      name: 'atlas_challenges_total',
      help: `Total number of challenges. Status label is one of [${Object.values(atlasResolutionStatus)}]`,
      labelNames: ['status'],
      registers: [registry]
    });
  }
}
