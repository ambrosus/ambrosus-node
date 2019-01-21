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
    return Object.entries(this.activeChallengesDict).map(([key, value]) => ({...value, challengeId: key}));
  }

  add(challenges) {
    challenges.forEach((challenge) => {
      if (!this.has(challenge.challengeId)) {
        this.activeChallengesDict[challenge.challengeId] = pick(challenge, 'challengeId');
      }
    });
  }

  has(challengeId) {
    return this.activeChallengesDict[challengeId] !== undefined;
  }

  get(challengeId) {
    return this.activeChallengesDict[challengeId];
  }

  expire(challenges) {
    challenges.forEach(({challengeId}) => {
      delete this.activeChallengesDict[challengeId];
    });
  }

  decreaseActiveCount(challenges) {
    challenges.forEach(({challengeId}) => {
      if (this.has(challengeId)) {
        this.activeChallengesDict[challengeId].count --;
        if (this.get(challengeId).count <= 0) {
          delete this.activeChallengesDict[challengeId];
        }
      }
    });
  }
}
