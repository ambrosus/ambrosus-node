/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import PeriodicWorker from './periodic_worker';
import {getDefaultAddress} from '../utils/web3_tools';
import {Role} from '../services/roles_repository';

export default class AtlasWorker extends PeriodicWorker {
  constructor(web3, dataModelEngine, rolesRepository, challengesRepository, logger) {
    super(5000, logger);
    this.web3 = web3;
    this.dataModelEngine = dataModelEngine;
    this.rolesRepository = rolesRepository;
    this.challengesRepository = challengesRepository;
  }

  async beforeWorkLoop() {
    this.logger.info('Atlas worker starting');
    const role = await this.rolesRepository.onboardedRole(getDefaultAddress(this.web3));
    if (!role.is(Role.ATLAS)) {
      this.logger.error('Cannot start atlas worker until being onboarded as ATLAS');
      throw new Error('Not onboarded as ATLAS');
    }
  }

  async tryToResolve({sheltererId, bundleId, challengeId}) {
    this.logger.info({message: `Trying to fetch the bundle`, sheltererId, bundleId, challengeId});
    await this.dataModelEngine.downloadBundle(bundleId, sheltererId);
    await this.challengesRepository.resolveChallenge(challengeId);
    this.logger.info({message: '🍾 Yahoo! The bundle is ours.', bundleId});
  }

  async periodicWork() {
    const challenges = await this.challengesRepository.resolvableChallenges();
    for (const challenge of challenges) {
      await this.tryToResolve(challenge).catch((err) => this.logger.error({
        message: `Failed to resolve challenge: ${err.message}`,
        ...challenge
      }));
    }
  }
}
