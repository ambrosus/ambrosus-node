/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import QueryBuilder from './query_builder';
import FindQueryObject from './find_query_object';
import FindEventQueryObjectFactory from './find_event_query_object';

export class FindAssetQueryObject extends FindQueryObject {
  constructor(db, criteria, accessLevel) {
    super(db, 'assets', criteria);
    this.accessLevel = accessLevel;
  }

  getSortingKey() {
    return [['content.idData.timestamp', 'descending']];
  }

  async selectByIdentifier(identifiers) {
    const findEventQueryObject = new FindEventQueryObjectFactory(this.db).create({
      data: {
        type: 'ambrosus.event.identifiers',
        ...identifiers
      }
    }, this.accessLevel ? this.accessLevel : 0);
    const events = await findEventQueryObject.execute();
    return events.results.map((event) => event.content.idData.assetId);
  }

  async assembleQuery() {
    this.queryBuilder = new QueryBuilder();
    let identifierIds;

    if (this.criteria.identifier) {
      identifierIds = await this.selectByIdentifier(this.criteria.identifier);
    }
    const queryParts = {
      createdBy: {'content.idData.createdBy': this.criteria.createdBy},
      identifier: {assetId: {$in: identifierIds}}
    };

    this.queryBuilder.addNeededPartsToQuery(this.criteria, queryParts);

    return this.queryBuilder.compose();
  }
}

export default class FindAssetQueryObjectFactory {
  constructor(db) {
    this.db = db;
  }

  create(criteria, accessLevel) {
    return new FindAssetQueryObject(this.db, criteria, accessLevel);
  }
}
