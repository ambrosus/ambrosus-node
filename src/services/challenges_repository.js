/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {put} from '../utils/dict_utils';

export default class ChallengesRepository {
  constructor(challengesWrapper, configWrapper) {
    this.challengesWrapper = challengesWrapper;
    this.configWrapper = configWrapper;
  }

  filterOutFinished(allChallenges, resolvedChallenges, timedOutChallenges) {
    const timedOutSet = new Set(timedOutChallenges.map(({challengeId}) => challengeId));
    const startedCount = allChallenges.reduce((acc, {challengeId, count}) => put(acc, challengeId, count), {});
    const unresolvedCount = resolvedChallenges.reduce((acc, {challengeId}) => put(acc, challengeId, acc[challengeId] - 1), startedCount);
    return allChallenges.filter(({challengeId}) => unresolvedCount[challengeId] > 0 && !timedOutSet.has(challengeId));
  }

  extractChallengeFromEvent(challengeEvents) {
    return challengeEvents.map(({returnValues: {sheltererId, bundleId, challengeId, count}}) => ({sheltererId, bundleId, challengeId, count}));
  }

  async ongoingChallenges() {
    const challengeDuration = await this.configWrapper.challengeDuration();
    const fromBlock = await this.challengesWrapper.earliestMeaningfulBlock(challengeDuration);
    const allChallengeEvents = await this.challengesWrapper.challenges(fromBlock);
    const resolvedChallengeEvents = await this.challengesWrapper.resolvedChallenges(fromBlock);
    const timedOutChallengeEvents = await this.challengesWrapper.timedOutChallenges(fromBlock);
    const notFinishedChallenges = this.filterOutFinished(
      this.extractChallengeFromEvent(allChallengeEvents),
      this.extractChallengeFromEvent(resolvedChallengeEvents),
      this.extractChallengeFromEvent(timedOutChallengeEvents)
    );
    const isInProgress = await Promise.all(notFinishedChallenges.map(({challengeId}) => this.challengesWrapper.isInProgress(challengeId)));
    return notFinishedChallenges.filter((challenge, index) => isInProgress[index]);
  }

  async resolveChallenge(challengeId) {
    if (!await this.challengesWrapper.canResolve(challengeId)) {
      throw new Error('Cannot resolve the challenge');
    }
    return this.challengesWrapper.resolve(challengeId);
  }
}
