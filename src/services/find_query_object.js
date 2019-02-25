/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class FindQueryObject {
  constructor (db, collection, criteria = {}) {
    this.db = db;
    this.collection = collection;
    this.criteria = criteria;
  }

  getBlacklistedFields() {
    return {
      _id: 0,
      repository: 0
    };
  }

  getSortingKey() {
    throw new Error(`Method 'getSortingKey' should be overridden`);
  }

  assembleQuery() {
    throw new Error(`Method 'assembleQuery' should be overridden`);
  }

  getItemTransformer() {
    return null;
  }


  assembleOptionsForQuery() {
    const pageSize = this.criteria.perPage || 100;
    const pageNumber = this.criteria.page || 0;
    const resultsToSkip = pageNumber * pageSize;

    return {
      skip: resultsToSkip,
      limit: pageSize,
      sort: this.getSortingKey(),
      projection: this.getBlacklistedFields()
    };
  }

  async execute() {
    const query = this.assembleQuery();
    const options = this.assembleOptionsForQuery();
    let cursor = this.db
      .collection(this.collection)
      .find(query, options);

    if (this.getItemTransformer() !== null) {
      cursor = cursor.map(this.getItemTransformer());
    }

    return {
      results: await cursor.toArray(),
      resultCount: await cursor.count(false)
    };
  }
}
