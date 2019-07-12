/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {getTimestamp} from '../utils/time_utils';

export default class FailedResolutionsCache {
  constructor() {
    this.failedResolutionsEndTime = {};
  }

  rememberFailedResolution(resolutionId, ttl) {
    this.failedResolutionsEndTime[resolutionId] = getTimestamp() + ttl;
  }

  didResolutionFailRecently(resolutionId) {
    if (this.failedResolutionsEndTime[resolutionId]) {
      if (this.failedResolutionsEndTime[resolutionId] > getTimestamp()) {
        return true;
      }
      delete this.failedResolutionsEndTime[resolutionId];
    }
    return false;
  }

  clearOutdatedResolutions() {
    const resolutionIds = Object.keys(this.failedResolutionsEndTime);
    for (const resolutionId of resolutionIds) {
      if (this.failedResolutionsEndTime[resolutionId] <= getTimestamp()) {
        delete this.failedResolutionsEndTime[resolutionId];
      }
    }
  }
}
