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

  filterOutFinishedChallenges(allChallenges, resolvedChallenges, timedOutChallenges, ownAddress) {
    const timedOutSet = new Set(timedOutChallenges.map(({challengeId}) => challengeId));
    const startedCount = allChallenges.reduce((acc, {challengeId, count}) => put(acc, challengeId, count), {});
    const unresolvedCount = resolvedChallenges.reduce(
      (acc, {challengeId, resolverId}) => {
        if (resolverId === ownAddress) {
          return put(acc, challengeId, 0);
        }
        return put(acc, challengeId, acc[challengeId] - 1);
      },
      startedCount
    );
    return allChallenges.filter(({challengeId}) => unresolvedCount[challengeId] > 0 && !timedOutSet.has(challengeId));
  }

  extractChallengeFromEvent(challengeEvents, outputFields) {
    return challengeEvents.map(
      ({blockNumber, returnValues}) => outputFields.reduce(
        (acc, fieldName) => put(acc, fieldName, returnValues[fieldName]),
        {blockNumber}
      )
    );
  }

  sortChallenges(challenges) {
    return challenges.sort((left, right) => left.blockNumber - right.blockNumber);
  }

  async ongoingChallenges() {
    const challengeDuration = await this.configWrapper.challengeDuration();
    const fromBlock = await this.challengesWrapper.earliestMeaningfulBlock(challengeDuration);
    const allChallengeEvents = await this.challengesWrapper.challenges(fromBlock);
    const resolvedChallengeEvents = await this.challengesWrapper.resolvedChallenges(fromBlock);
    const timedOutChallengeEvents = await this.challengesWrapper.timedOutChallenges(fromBlock);

    return this.sortChallenges(
      this.filterOutFinishedChallenges(
        this.extractChallengeFromEvent(allChallengeEvents, ['challengeId', 'sheltererId', 'bundleId', 'count']),
        this.extractChallengeFromEvent(resolvedChallengeEvents, ['challengeId', 'resolverId']),
        this.extractChallengeFromEvent(timedOutChallengeEvents, ['challengeId']),
        this.challengesWrapper.defaultAddress
      )
    );
  }

  async resolveChallenge(challengeId) {
    if (!await this.challengesWrapper.canResolve(challengeId)) {
      throw new Error('Unable to resolve challenge - boundary check fail');
    }
    return this.challengesWrapper.resolve(challengeId);
  }
}
