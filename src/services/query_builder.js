/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class QueryBuilder {
  constructor() {
    this.queryParts = [];
  }

  add(part) {
    this.queryParts.push(part);
  }

  addNeededPartsToQuery(givenCriteria, parts) {
    for (const part in parts) {
      if (givenCriteria[part] !== undefined) {
        this.add(parts[part]);
      }
    }
  }

  compose() {
    if (this.queryParts.length === 0) {
      return {};
    }
    if (this.queryParts.length === 1) {
      return this.queryParts[0];
    }
    return {
      $and: this.queryParts
    };
  }
}

