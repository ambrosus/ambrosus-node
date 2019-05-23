/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


export default class ActiveChallengesCache {
  constructor() {
    this.activeChallengesDict = {};
  }

  get activeChallenges() {
    return this.sortChronologically(Object.values(this.activeChallengesDict));
  }

  add(challenge) {
    if (!this.has(challenge.challengeId)) {
      this.activeChallengesDict[challenge.challengeId] = challenge;
    }
  }

  has(challengeId) {
    return this.activeChallengesDict[challengeId] !== undefined;
  }

  get(challengeId) {
    return this.activeChallengesDict[challengeId];
  }

  expire(challengeId) {
    delete this.activeChallengesDict[challengeId];
  }

  decreaseActiveCount(challengeId) {
    if (this.has(challengeId)) {
      this.activeChallengesDict[challengeId].count --;
      if (this.get(challengeId).count <= 0) {
        this.expire(challengeId);
      }
    }
  }

  applyIncomingChallengeEvents(startedChallenges, resolvedChallenges, timedOutChallenges) {
    // Optimised for memory usage
    const totalChallengeCount = startedChallenges.length + resolvedChallenges.length + timedOutChallenges.length;
    const sortedChallengesGroups = [
      this.sortChronologically(startedChallenges),
      this.sortChronologically(resolvedChallenges),
      this.sortChronologically(timedOutChallenges)
    ];
    const groupIndexes = [0, 0, 0];

    const getNextChallengeForGroup = (groupIndex) => sortedChallengesGroups[groupIndex][groupIndexes[groupIndex]];
    const bestIndex = (predicate) => (values) => values.reduce(
      (bestIndex, value, index) => (predicate(value, values[bestIndex]) ? index : bestIndex), undefined);
    const chooseIndexWithMinimalBlockNumber = bestIndex((firstChallenge, secondChallenge) => this.compareChallengesByBlockNumberAscending(firstChallenge, secondChallenge) < 0);
    const challengeActions = [
      (challenge) => this.add(challenge),
      ({challengeId}) => this.decreaseActiveCount(challengeId),
      ({challengeId}) => this.expire(challengeId)
    ];

    while (groupIndexes[0] + groupIndexes[1] + groupIndexes[2] < totalChallengeCount) {
      const nextGroupIndex = chooseIndexWithMinimalBlockNumber([getNextChallengeForGroup(0), getNextChallengeForGroup(1), getNextChallengeForGroup(2)]);
      challengeActions[nextGroupIndex](getNextChallengeForGroup(nextGroupIndex));
      groupIndexes[nextGroupIndex]++;
    }
  }

  compareChallengesByBlockNumberAscending(firstChallenge, secondChallenge) {
    if (!firstChallenge) {
      return 1;
    }
    if (!secondChallenge) {
      return -1;
    }
    if  (firstChallenge.blockNumber !== secondChallenge.blockNumber) {
      return firstChallenge.blockNumber - secondChallenge.blockNumber;
    }
    return firstChallenge.logIndex - secondChallenge.logIndex;
  }

  sortChronologically(challenges) {
    return challenges.sort(this.compareChallengesByBlockNumberAscending);
  }
}
