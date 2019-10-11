/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class ActiveResolutionsCache {
  constructor(resolutionIdField) {
    this.resolutionIdField = resolutionIdField;
    this.activeResolutionsDict = {};
  }

  get activeResolutions() {
    return this.sortChronologically(Object.values(this.activeResolutionsDict));
  }

  setActiveResolutions(resolutions) {
    this.activeResolutionsDict = {};
    for (const resolution of resolutions) {
      this.add(resolution);
    }
  }

  add(resolution) {
    if (!this.has(resolution[this.resolutionIdField])) {
      if (resolution.count === undefined) {
        resolution.count = 1;
      }
      this.activeResolutionsDict[resolution[this.resolutionIdField]] = resolution;
    }
  }

  has(resolutionId) {
    return this.activeResolutionsDict[resolutionId] !== undefined;
  }

  get(resolutionId) {
    return this.activeResolutionsDict[resolutionId];
  }

  expire(resolutionId) {
    delete this.activeResolutionsDict[resolutionId];
  }

  decreaseActiveCount(resolutionId) {
    if (this.has(resolutionId)) {
      this.activeResolutionsDict[resolutionId].count --;
      if (this.get(resolutionId).count <= 0) {
        this.expire(resolutionId);
      }
    }
  }

  applyIncomingResolutionEvents(startedResolutions, resolvedResolutions, timedOutResolutions) {
    const addAction = (resolution, action) => ({...resolution, action});

    const startedResolutionsWithAction = startedResolutions.map((resolution) => addAction(resolution, () => this.add(resolution)));
    const resolvedResolutionsWithAction = resolvedResolutions.map((resolution) => addAction(resolution, () => this.decreaseActiveCount(resolution[this.resolutionIdField])));
    const timedOutResolutionsWithAction = timedOutResolutions.map((resolution) => addAction(resolution, () => this.expire(resolution[this.resolutionIdField])));

    const resolutionsWithActionList = this.sortChronologically([...startedResolutionsWithAction, ...resolvedResolutionsWithAction, ...timedOutResolutionsWithAction]);

    resolutionsWithActionList.forEach((resolution) => resolution.action());
  }

  sortChronologically(resolutions) {
    return resolutions.sort((left, right) => {
      if  (left.blockNumber !== right.blockNumber) {
        return left.blockNumber - right.blockNumber;
      }
      return left.logIndex - right.logIndex;
    });
  }
}
