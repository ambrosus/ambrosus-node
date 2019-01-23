/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {pick} from '../utils/dict_utils';

export default class ActiveChallengesCache {
  constructor() {
    this.activeChallengesDict = {};
  }

  get activeChallenges() {
    return this.sortChronologically(Object.entries(this.activeChallengesDict).map(([key, value]) => ({...value, challengeId: key})));
  }

  add(challenge) {
    if (!this.has(challenge.challengeId)) {
      this.activeChallengesDict[challenge.challengeId] = pick(challenge, 'challengeId');
    }
  }

  has(challengeId) {
    return this.activeChallengesDict[challengeId] !== undefined;
  }

  get(challengeId) {
    return this.activeChallengesDict[challengeId];
  }

  expire(challenge) {
    delete this.activeChallengesDict[challenge.challengeId];
  }

  decreaseActiveCount(challenge) {
    if (this.has(challenge.challengeId)) {
      this.activeChallengesDict[challenge.challengeId].count --;
      if (this.get(challenge.challengeId).count <= 0) {
        this.expire(challenge);
      }
    }
  }

  applyIncomingChallengeEvents(startedChallenges, resolvedChallenges, timedOutChallenges) {
    const startedChallengesWithAction = startedChallenges.map((challenge) => this.addAction(challenge, () => this.add(challenge)));
    const resolvedChallengesWithAction = resolvedChallenges.map((challenge) => this.addAction(challenge, () => this.decreaseActiveCount(challenge)));
    const timedOutChallengesWithAction = timedOutChallenges.map((challenge) => this.addAction(challenge, () => this.expire(challenge)));

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

  addAction(challenge, action) {
    return {...challenge, action};
  }
}
