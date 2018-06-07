/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {
  validateFieldsConstrainedToSet,
  validateIntegerParameterAndCast,
  validateIsAddress,
  validateNonNegativeInteger,
  validatePathsNotEmpty
} from '../utils/validations';
import JsonSchemaValidator from '../validators/json_schema_validator';
import EventEntryValidator from '../validators/event_entry_validator.js';
import eventContentSchema from '../validators/schemas/event';
import indentifiersSchema from '../validators/schemas/custom/ambrosus.event.identifiers.json';
import locationSchema from '../validators/schemas/custom/ambrosus.event.location.asset.json';
import locationEventGeoSchema from '../validators/schemas/custom/ambrosus.event.location.geo.json';
import locationAssetGeoSchema from '../validators/schemas/custom/ambrosus.asset.location.geo.json';
import {pick, put} from '../utils/dict_utils';
import {ValidationError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';

export default class EntityBuilder {
  constructor(identityManager, maximumEntityTimestampOvertake) {
    this.eventValidators = [
      new JsonSchemaValidator(eventContentSchema),
      new EventEntryValidator('ambrosus.event.identifiers', new JsonSchemaValidator(indentifiersSchema)),
      new EventEntryValidator('ambrosus.event.location.asset', new JsonSchemaValidator(locationSchema)),
      new EventEntryValidator('ambrosus.event.location.geo', new JsonSchemaValidator(locationEventGeoSchema)),
      new EventEntryValidator('ambrosus.asset.location.geo', new JsonSchemaValidator(locationAssetGeoSchema))
    ];
    this.identityManager = identityManager;
    this.maximumEntityTimestampOvertake = maximumEntityTimestampOvertake;
  }

  validateAsset(asset) {
    validatePathsNotEmpty(asset, [
      'assetId',
      'content.idData',
      'content.signature',
      'content.idData.createdBy',
      'content.idData.timestamp',
      'content.idData.sequenceNumber'
    ]);
    this.ensureTimestampWithinLimit(asset.content.idData.timestamp);
    validateFieldsConstrainedToSet(asset, ['content', 'assetId']);
    validateFieldsConstrainedToSet(asset.content, ['idData', 'signature']);

    this.identityManager.validateSignature(asset.content.idData.createdBy, asset.content.signature, asset.content.idData);
  }

  validateEvent(event) {
    validatePathsNotEmpty(event, [
      'eventId',
      'content.signature',
      'content.idData',
      'content.idData.assetId',
      'content.idData.createdBy',
      'content.idData.timestamp',
      'content.idData.dataHash',
      'content.idData.accessLevel',
      'content.data'
    ]);
    this.eventValidators.forEach((validator) => validator.validate(event.content));
    this.ensureTimestampWithinLimit(event.content.idData.timestamp);
    validateFieldsConstrainedToSet(event, ['content', 'eventId']);
    validateFieldsConstrainedToSet(event.content, ['idData', 'data', 'signature']);
    validateNonNegativeInteger(event.content.idData.accessLevel, `Access level should be a non-negative integer, instead got ${event.content.idData.accessLevel}`);
    validateNonNegativeInteger(event.content.idData.timestamp, `Timestamp should be a non-negative integer, instead got ${event.content.idData.accessLevel}`);

    this.identityManager.validateSignature(event.content.idData.createdBy, event.content.signature, event.content.idData);
  }

  ensureTimestampWithinLimit (timestamp) {
    if (getTimestamp() + this.maximumEntityTimestampOvertake < timestamp) {
      throw new ValidationError(`Timestamp ${timestamp} located too far in the future`);
    }
  }

  prepareEventForBundlePublication(event) {
    if (event.content.idData.accessLevel === 0) {
      return event;
    }
    return pick(event, 'content.data');
  }

  setBundle(entity, bundle) {
    return put(entity, 'metadata.bundleId', bundle);
  }

  setEntityUploadTimestamp(entity) {
    const currentTimestamp = getTimestamp();
    return put(entity, 'metadata.entityUploadTimestamp', currentTimestamp);
  }

  removeBundle(entity) {
    const afterRemoval = pick(entity, 'metadata.bundleId');
    if (Object.keys(afterRemoval.metadata).length === 0) {
      return pick(afterRemoval, 'metadata');
    }
    return afterRemoval;
  }

  assembleBundle(assets, events, timestamp, secret) {
    const createdBy = this.identityManager.addressFromSecret(secret);
    const preparedEvents = events.map((event) => this.prepareEventForBundlePublication(event));
    const entries = [
      ...assets,
      ...preparedEvents
    ].map((entry) => this.removeBundle(entry));
    const entriesHash = this.identityManager.calculateHash(entries);
    const idData = {
      createdBy,
      entriesHash,
      timestamp
    };
    const signature = this.identityManager.sign(secret, idData);
    const content = {
      signature,
      idData,
      entries
    };
    const bundleId = this.identityManager.calculateHash(content);

    return {
      bundleId,
      content
    };
  }

  validateAndCastFindEventsParams(params) {
    const allowedParametersList = ['assetId', 'fromTimestamp', 'toTimestamp', 'page', 'perPage', 'createdBy', 'data'];

    validateFieldsConstrainedToSet(params, allowedParametersList);

    this.ensureGeoLocationParamsCorrectlyPlaced(params);

    params.fromTimestamp = validateIntegerParameterAndCast(params.fromTimestamp, 'fromTimestamp');
    params.toTimestamp = validateIntegerParameterAndCast(params.toTimestamp, 'toTimestamp');
    params.page = validateIntegerParameterAndCast(params.page, 'page');
    params.perPage = validateIntegerParameterAndCast(params.perPage, 'perPage');
    if (params.createdBy) {
      validateIsAddress(params.createdBy);
    }

    return {...params};
  }

  validateAndCastFindAssetsParams(params) {
    const allowedParametersList = ['page', 'perPage', 'createdBy'];

    validateFieldsConstrainedToSet(params, allowedParametersList);

    params.page = validateIntegerParameterAndCast(params.page, 'page');
    params.perPage = validateIntegerParameterAndCast(params.perPage, 'perPage');
    if (params.createdBy) {
      validateIsAddress(params.createdBy);
    }

    return {...params};
  }


  ensureGeoLocationParamsCorrectlyPlaced(params) {
    for (const key in params.data) {
      if (key === 'geoJson' &&
        (params.data[key].locationLongitude === undefined
        || params.data[key].locationLatitude === undefined
        || params.data[key].locationMaxDistance === undefined)) {
        throw new ValidationError(`geoJson field stores only geographical coordinates`);
      }
      if (key !== 'geoJson' &&
        (params.data[key].locationLongitude !== undefined
        || params.data[key].locationLatitude !== undefined
        || params.data[key].locationMaxDistance !== undefined)) {
        throw new ValidationError(`Location can only be stored on geoJson field`);
      }
    }
  }
}
