/*
Copyright: Ambrosus Technologies GmbH
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
    const addAction = (challenge, action) => ({...challenge, action});

    const startedChallengesWithAction = startedChallenges.map((challenge) => addAction(challenge, () => this.add(challenge)));
    const resolvedChallengesWithAction = resolvedChallenges.map((challenge) => addAction(challenge, () => this.decreaseActiveCount(challenge.challengeId)));
    const timedOutChallengesWithAction = timedOutChallenges.map((challenge) => addAction(challenge, () => this.expire(challenge.challengeId)));

    const challengesWithActionList = this.sortChronologically([...startedChallengesWithAction, ...resolvedChallengesWithAction, ...timedOutChallengesWithAction]);

    challengesWithActionList.forEach((challenge) => challenge.action());
  }

  sortChronologically(challenges) {
    return challenges.sort((left, right) => {
      if  (left.blockNumber !== right.blockNumber) {
        return left.blockNumber - right.blockNumber;
      }
      return left.logIndex - right.logIndex;
    });
  }
}
