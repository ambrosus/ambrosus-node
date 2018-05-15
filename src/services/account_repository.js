/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Query from './query';

export default class AccountRepository {
  constructor(db) {
    this.db = db;
  }

  /* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^secret$" }]*/
  async store(account) {
    const {address} = account;
    await this.db.collection('accounts').updateOne({address}, {$set : {...account}}, {upsert : true});
  }

  async update(address, changedParams) {
    await this.db.collection('accounts').updateOne({address}, {$set : {...changedParams}});
    return await this.db.collection('accounts').findOne({address}, {fields: {_id: 0}});
  }

  async get(address) {
    return this.db.collection('accounts').findOne({address}, {fields: {_id: 0}});
  }

  getConfigurationForFindQuery() {
    const RESULT_LIMIT = 100;
    const query = new Query();
    const options = {
      limit: RESULT_LIMIT,
      sort: [['registeredOn', 'descending']],
      fields: {_id: 0}
    };
    return {query: query.compose(), options};
  }

  async find() {
    const {query, options} = this.getConfigurationForFindQuery();
    const cursor = this.db
      .collection('accounts')
      .find(query, options);
    return {
      results: await cursor.toArray(),
      resultCount: await cursor.count(false)
    };
  }
}
