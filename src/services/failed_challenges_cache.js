/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {getTimestamp} from '../utils/time_utils';

export default class FailedChallengesCache {
  constructor() {
    this.failedChallengesEndTime = {};
  }

  rememberFailedChallenge(challengeId, ttl) {
    this.failedChallengesEndTime[challengeId] = getTimestamp() + ttl;
  }

  didChallengeFailRecently(challengeId) {
    if (this.failedChallengesEndTime[challengeId]) {
      if (this.failedChallengesEndTime[challengeId] > getTimestamp()) {
        return true;
      }
      delete this.failedChallengesEndTime[challengeId];
    }
    return false;
  }

  clearOutdatedChallenges() {
    const challengeIds = Object.keys(this.failedChallengesEndTime);
    for (const challengeId of challengeIds) {
      if (this.failedChallengesEndTime[challengeId] <= getTimestamp()) {
        delete this.failedChallengesEndTime[challengeId];
      }
    }
  }
}
