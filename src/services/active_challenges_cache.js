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
      this.activeChallengesDict[challenge.challengeId] = pick(this.removeType(challenge), 'challengeId');
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
        delete this.activeChallengesDict[challenge.challengeId];
      }
    }
  }

  applyIncomingChallengeEvents(startedChallenges, resolvedChallenges, timedOutChallenges) {
    const startedChallengesActions = startedChallenges.map((challengeAction) => this.addType(challengeAction, 'issued'));
    const resolvedChallengesActions = resolvedChallenges.map((challengeAction) => this.addType(challengeAction, 'resolved'));
    const timedOutChallengesActions = timedOutChallenges.map((challengeAction) => this.addType(challengeAction, 'expired'));

    const challengeActionList = this.sortChronologically([...startedChallengesActions, ...resolvedChallengesActions, ...timedOutChallengesActions]);

    challengeActionList.forEach((challengeAction) => {
      if (challengeAction.type === 'issued') {
        this.add(challengeAction);
      }
      if (challengeAction.type === 'resolved') {
        this.decreaseActiveCount(challengeAction);
      }
      if (challengeAction.type === 'expired') {
        this.expire(challengeAction);
      }
    });
  }

  sortChronologically(challenges) {
    return challenges.sort((left, right) => {
      if  (left.blockNumber < right.blockNumber) {
        return -1;
      }
      if  (left.blockNumber > right.blockNumber) {
        return 1;
      }
      if  (left.logIndex < right.logIndex) {
        return -1;
      }
      if  (left.logIndex > right.logIndex) {
        return 1;
      }
      return 0;
    });
  }

  addType(challengeAction, type) {
    return {...challengeAction, type};
  }
  removeType(challengeAction) {
    return pick(challengeAction, 'type');
  }
}
