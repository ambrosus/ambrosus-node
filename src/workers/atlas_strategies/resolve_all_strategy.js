/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import AtlasChallengeParticipationStrategy from './atlas_challenge_resolution_strategy';

export default class ResolveAllStrategy extends AtlasChallengeParticipationStrategy {
  // eslint-disable-next-line no-unused-vars
  async shouldFetchBundle(challenge) {
    return true;
  }

  // eslint-disable-next-line no-unused-vars
  async shouldResolveChallenge(bundleMetadata) {
    return true;
  }
}
