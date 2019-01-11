/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

/** @abstract */
export default class AtlasChallengeParticipationStrategy {
  get workerInterval() {
    return 5;
  }

  get retryTimeout() {
    return 86400; // 1 day
  }

  // eslint-disable-next-line no-unused-vars
  async shouldFetchBundle(challenge) {
    throw new Error('Should be implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async shouldResolveChallenge(bundleMetadata) {
    throw new Error('Should be implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async afterChallengeResolution(challenge) { }
}
