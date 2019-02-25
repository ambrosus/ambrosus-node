/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import QueryBuilder from './query_builder';
import FindQueryObject from './find_query_object';
import {pick} from '../utils/dict_utils';

export class FindEventQueryObject extends FindQueryObject {
  constructor(db, criteria, accessLevel) {
    super(db, 'events', criteria);
    this.accessLevel = accessLevel;
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
        coordinates: [value.locationLongitude, value.locationLatitude]
      },
      $maxDistance: value.locationMaxDistance
    }}});
  }

  addIdentifierPart(value) {
    for (const key in value) {
      const element = value[key];
      this.queryBuilder.add({'content.data': {$elemMatch: {[`identifiers.${key}`]: element}}});
    }
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

    if (this.criteria.data) {
      this.addDataAccessLevelLimitationIfNeeded(this.accessLevel);
    }
    for (const key in this.criteria.data) {
      switch (key) {
        case 'geoJson':
          this.addGeoPart(this.criteria.data[key]);
          break;
        case 'identifiers':
          this.addIdentifierPart(this.criteria.data[key]);
          break;
        default:
          this.addDefaultPart(key, this.criteria.data[key]);
          break;
      }
    }
    const queryParts = {
      assetId : {'content.idData.assetId': this.criteria.assetId},
      createdBy : {'content.idData.createdBy': this.criteria.createdBy},
      fromTimestamp : {'content.idData.timestamp': {$gte: this.criteria.fromTimestamp}},
      toTimestamp : {'content.idData.timestamp': {$lte: this.criteria.toTimestamp}}
    };

    this.queryBuilder.addNeededPartsToQuery(this.criteria, queryParts);

    return this.queryBuilder.compose();
  }
}

export default class FindEventQueryObjectFactory {
  constructor(db) {
    this.db = db;
  }

  create(criteria, accessLevel) {
    return new FindEventQueryObject(this.db, criteria, accessLevel);
  }
}
