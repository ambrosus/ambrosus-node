/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import QueryBuilder from './query_builder';
import FindQueryObject from './find_query_object';

export class FindAccountQueryObject extends FindQueryObject {
  constructor(db) {
    super(db, 'accounts');
  }

  getSortingKey() {
    return [['registeredOn', 'descending']];
  }

  assembleQuery() {
    const queryBuilder = new QueryBuilder();
    return queryBuilder.compose();
  }
}

export default class FindAccountQueryObjectFactory {
  constructor(db) {
    this.db = db;
  }

  create() {
    return new FindAccountQueryObject(this.db);
  } 
}
