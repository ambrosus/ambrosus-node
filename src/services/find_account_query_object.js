/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import QueryBuilder from './query_builder';

export default class FindEventQueryObject {
  constructor(db) {
    this.db = db;
    this.blacklistedFields = {
      _id: 0,
      repository: 0
    };
  }
  
  assembleConfigurationForFindAccountsQuery() {
    const queryBuilder = new QueryBuilder();
    return queryBuilder.compose();
  }

  assembleOptionsForFindAccountsQuery() {
    const RESULT_LIMIT = 100;
    const options = {
      limit: RESULT_LIMIT,
      sort: [['registeredOn', 'descending']],
      fields: this.blacklistedFields
    };
    return options;
  }

  async find() {
    const query = this.assembleConfigurationForFindAccountsQuery();
    const options = this.assembleOptionsForFindAccountsQuery();
    const cursor = this.db
      .collection('accounts')
      .find(query, options);
    return {
      results: await cursor.toArray(),
      resultCount: await cursor.count(false)
    };
  }
}
