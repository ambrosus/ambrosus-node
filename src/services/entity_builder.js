/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import validateAndCast from '../utils/validations';
import JsonSchemaValidator from '../validators/json_schema_validator';
import EventEntryValidator from '../validators/event_entry_validator.js';
import eventContentSchema from '../validators/schemas/event';
import identifiersAssetSchema from '../validators/schemas/custom/ambrosus.asset.identifiers.json';
import identifiersEventSchema from '../validators/schemas/custom/ambrosus.event.identifiers.json';
import locationEventSchema from '../validators/schemas/custom/ambrosus.event.location.json';
import locationAssetSchema from '../validators/schemas/custom/ambrosus.asset.location.json';
import infoAssetSchema from '../validators/schemas/custom/ambrosus.asset.info.json';
import {pick, put} from '../utils/dict_utils';
import {ValidationError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';

export default class EntityBuilder {
  constructor(identityManager, maximumEntityTimestampOvertake) {
    this.eventValidators = [
      new JsonSchemaValidator(eventContentSchema),
      new EventEntryValidator('ambrosus.asset.identifiers', new JsonSchemaValidator(identifiersAssetSchema)),
      new EventEntryValidator('ambrosus.event.identifiers', new JsonSchemaValidator(identifiersEventSchema)),
      new EventEntryValidator('ambrosus.asset.location', new JsonSchemaValidator(locationAssetSchema)),
      new EventEntryValidator('ambrosus.event.location', new JsonSchemaValidator(locationEventSchema)),
      new EventEntryValidator('ambrosus.asset.info', new JsonSchemaValidator(infoAssetSchema))
    ];
    this.identityManager = identityManager;
    this.maximumEntityTimestampOvertake = maximumEntityTimestampOvertake;
  }

  validateAsset(asset) {
    validateAndCast(asset)
      .required([
        'assetId',
        'content.idData',
        'content.signature',
        'content.idData.createdBy',
        'content.idData.timestamp',
        'content.idData.sequenceNumber'
      ])
      .fieldsConstrainedToSet(['content', 'assetId'])
      .fieldsConstrainedToSet(['idData', 'signature'], 'content')
      .validate(['content.idData.timestamp'], (timestamp) => this.isTimestampWithinLimit(timestamp),
        'Timestamp located too far in the future');

    this.identityManager.validateSignature(asset.content.idData.createdBy, asset.content.signature,
      asset.content.idData);
  }

  validateEvent(event) {
    validateAndCast(event)
      .required([
        'eventId',
        'content.signature',
        'content.idData',
        'content.idData.assetId',
        'content.idData.createdBy',
        'content.idData.timestamp',
        'content.idData.dataHash',
        'content.idData.accessLevel',
        'content.data'
      ])
      .validate(['content.idData.timestamp'], (timestamp) => this.isTimestampWithinLimit(timestamp),
        'Timestamp located too far in the future')
      .fieldsConstrainedToSet(['content', 'eventId'])
      .fieldsConstrainedToSet(['idData', 'data', 'signature'], 'content')
      .isNonNegativeInteger(['content.idData.accessLevel', 'content.idData.timestamp']);

    this.eventValidators.forEach((validator) => validator.validate(event.content));

    this.identityManager.validateSignature(event.content.idData.createdBy, event.content.signature,
      event.content.idData);
  }

  isTimestampWithinLimit(timestamp) {
    return getTimestamp() + this.maximumEntityTimestampOvertake >= timestamp;
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

    const castedParams = validateAndCast(params)
      .fieldsConstrainedToSet(allowedParametersList)
      .castNumber(['fromTimestamp', 'toTimestamp', 'page', 'perPage'])
      .isNonNegativeInteger(['fromTimestamp', 'toTimestamp', 'page', 'perPage'])
      .isAddress(['createdBy'])
      .getCastedParams();

    this.ensureGeoLocationParamsCorrectlyPlaced(params);
    return castedParams;
  }

  validateAndCastFindAssetsParams(params) {
    const allowedParametersList = ['page', 'perPage', 'createdBy', 'identifier', 'fromTimestamp', 'toTimestamp'];

    return validateAndCast(params)
      .fieldsConstrainedToSet(allowedParametersList)
      .castNumber(['page', 'perPage', 'fromTimestamp', 'toTimestamp'])
      .isNonNegativeInteger(['page', 'perPage', 'fromTimestamp', 'toTimestamp'])
      .isAddress(['createdBy'])
      .getCastedParams();
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
