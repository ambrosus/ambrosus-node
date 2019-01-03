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

  filterOutFinishedChallenges(allChallenges, resolvedChallenges, timedOutChallenges, ownAddress) {
    const timedOutSet = new Set(timedOutChallenges.map(({challengeId}) => challengeId));
    const startedCount = allChallenges.reduce(
      (acc, {challengeId, count}) => {
        acc[challengeId] = count;
        return acc;
      },
      {}
    );
    const unresolvedCount = resolvedChallenges.reduce(
      (acc, {challengeId, resolverId}) => {
        if (resolverId === ownAddress) {
          acc[challengeId] = 0;
        } else {
          acc[challengeId] -= 1;
        }
        return acc;
      },
      startedCount
    );
    const filtered = allChallenges.filter(({challengeId}) => unresolvedCount[challengeId] > 0 && !timedOutSet.has(challengeId));
    return filtered;
  }

  extractChallengeFromEvent(challengeEvents, outputFields) {
    return challengeEvents.map(
      ({blockNumber, returnValues}) => outputFields.reduce(
        (acc, fieldName) => {
          acc[fieldName] = returnValues[fieldName];
          return acc;
        },
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

    const startedChallenges = this.extractChallengeFromEvent(allChallengeEvents, ['challengeId', 'sheltererId', 'bundleId', 'count']);
    const resolvedChallenges = this.extractChallengeFromEvent(resolvedChallengeEvents, ['challengeId', 'resolverId']);
    const timedOutChallenges = this.extractChallengeFromEvent(timedOutChallengeEvents, ['challengeId']);
    const filtered = this.filterOutFinishedChallenges(
      startedChallenges,
      resolvedChallenges,
      timedOutChallenges,
      this.challengesWrapper.defaultAddress
    );
    const sorted = this.sortChallenges(
      filtered
    );
    return sorted;
  }

  async resolveChallenge(challengeId) {
    if (!await this.challengesWrapper.canResolve(challengeId)) {
      throw new Error('Unable to resolve challenge - boundary check fail');
    }
    return this.challengesWrapper.resolve(challengeId);
  }
}
