/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import QueryBuilder from './query_builder';
import FindQueryObject from './find_query_object';
import {pick} from '../utils/dict_utils';

export class FindEventQueryObject extends FindQueryObject {
  constructor(db, params, accessLevel) {
    super(db, 'events', params);
    this.accessLevel = accessLevel;
    this.blacklistedFields = this.getBlacklistedFields();
  }

  getSortingKey() {
    return [['content.idData.timestamp', 'descending']];
  }

  getItemTransformer() {
    return (event) => this.hideEventDataIfNecessary(event, this.accessLevel);
  }

  addDefaultPart(key, value) {
    this.queryBuilder.add({'content.data': {$elemMatch: {[key]: value}}});
  }

  addGeoPart(value) {
    this.queryBuilder.add({'content.data.geoJson': {$near: {
      $geometry: {
        type: 'Point',
        coordinates: [value.locationLongitude , value.locationLatitude]
      },
      $maxDistance: value.locationMaxDistance
    }}});
  }

  addDataAccessLevelLimitationIfNeeded(accessLevel) {
    if (!this.queryBuilder.queryParts.some((queryPart) => queryPart['content.idData.accessLevel'] !== undefined)) {
      const part = {'content.idData.accessLevel': {$lte: accessLevel}};
      this.queryBuilder.add(part);
    } else {
      this.queryBuilder.queryParts.forEach((queryPart) => {
        if (queryPart['content.idData.accessLevel'] !== undefined &&
          queryPart['content.idData.accessLevel'].$lte > accessLevel) {
          queryPart['content.idData.accessLevel'].$lte = accessLevel;
        }
      });
    }
  }

  hideEventDataIfNecessary(event, accessLevel) {
    if (!event) {
      return null;
    }
    return event.content.idData.accessLevel <= accessLevel ? event : pick(event, 'content.data');
  }

  assembleQuery() {
    this.queryBuilder = new QueryBuilder();

    if (this.params.data) {
      this.addDataAccessLevelLimitationIfNeeded(this.accessLevel);
    }
    for (const key in this.params.data) {
      switch (key) {
        case 'geoJson':
          this.addGeoPart(this.params.data[key]);
          break;
        default:
          this.addDefaultPart(key, this.params.data[key]);
          break;
      }
    }
    if (this.params.assetId) {
      this.queryBuilder.add({'content.idData.assetId': this.params.assetId});
    }
    if (this.params.createdBy) {
      this.queryBuilder.add({'content.idData.createdBy': this.params.createdBy});
    }
    if (this.params.fromTimestamp) {
      this.queryBuilder.add({'content.idData.timestamp': {$gte: this.params.fromTimestamp}});
    }
    if (this.params.toTimestamp) {
      this.queryBuilder.add({'content.idData.timestamp': {$lte: this.params.toTimestamp}});
    }

    return this.queryBuilder.compose();
  }
}

export default class FindEventQueryObjectFactory {
  constructor(db) {
    this.db = db;
  }

  create(params, accessLevel) {
    return new FindEventQueryObject(this.db, params, accessLevel);
  } 
}
