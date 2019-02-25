/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import QueryBuilder from './query_builder';
import FindQueryObject from './find_query_object';

export class FindAssetQueryObject extends FindQueryObject {
  constructor(db, criteria) {
    super(db, 'assets', criteria);
  }

  getSortingKey() {
    return [['content.idData.timestamp', 'descending']];
  }

  assembleQuery() {
    this.queryBuilder = new QueryBuilder();

    const queryParts = {
      createdBy: {'content.idData.createdBy': this.criteria.createdBy},
      fromTimestamp : {'content.idData.timestamp': {$gte: this.criteria.fromTimestamp}},
      toTimestamp : {'content.idData.timestamp': {$lte: this.criteria.toTimestamp}},
      assetIds: {assetId: {$in: this.criteria.assetIds}}
    };

    this.queryBuilder.addNeededPartsToQuery(this.criteria, queryParts);
    return this.queryBuilder.compose();
  }
}

export default class FindAssetQueryObjectFactory {
  constructor(db) {
    this.db = db;
  }

  create(criteria) {
    return new FindAssetQueryObject(this.db, criteria);
  }
}
