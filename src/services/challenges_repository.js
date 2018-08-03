/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class ChallengesRepository {
  constructor(challengesWrapper, configWrapper) {
    this.challengesWrapper = challengesWrapper;
    this.configWrapper = configWrapper;
  }

  async resolvableChallenges() {
    const challengeDuration = await this.configWrapper.challengeDuration();
    const fromBlock = await this.challengesWrapper.earliestMeaningfulBlock(challengeDuration);
    const events = await this.challengesWrapper.previousChallenges(fromBlock);
    const challenges = events.map(({returnValues: {sheltererId, bundleId, challengeId}}) => ({sheltererId, bundleId, challengeId}));
    const canResolve = await Promise.all(challenges.map(({challengeId}) => this.challengesWrapper.canResolve(challengeId)));
    return challenges.filter((challenge, index) => canResolve[index]);
  }

  async resolveChallenge(challengeId) {
    return this.challengesWrapper.resolve(challengeId);
  }
}
