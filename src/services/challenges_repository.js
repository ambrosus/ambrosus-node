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

  extractChallengeFromEvent(challengeEvents, outputFields) {
    return challengeEvents.map(({returnValues}) => outputFields.reduce((acc, fieldName) => put(acc, fieldName, returnValues[fieldName]), {}));
  }

  async ongoingChallenges() {
    const challengeDuration = await this.configWrapper.challengeDuration();
    const fromBlock = await this.challengesWrapper.earliestMeaningfulBlock(challengeDuration);
    const allChallengeEvents = await this.challengesWrapper.challenges(fromBlock);
    const resolvedChallengeEvents = await this.challengesWrapper.resolvedChallenges(fromBlock);
    const timedOutChallengeEvents = await this.challengesWrapper.timedOutChallenges(fromBlock);
    return this.filterOutFinished(
      this.extractChallengeFromEvent(allChallengeEvents, ['challengeId', 'sheltererId', 'bundleId', 'count']),
      this.extractChallengeFromEvent(resolvedChallengeEvents, ['challengeId']),
      this.extractChallengeFromEvent(timedOutChallengeEvents, ['challengeId'])
    );
  }

  async resolveChallenge(challengeId) {
    if (!await this.challengesWrapper.canResolve(challengeId)) {
      throw new Error('Cannot resolve the challenge');
    }
    return this.challengesWrapper.resolve(challengeId);
  }
}
