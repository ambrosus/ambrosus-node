import {
  validatePathsNotEmpty, validateFieldsConstrainedToSet,
  validateIntegerParameterAndCast, validateNonNegativeInteger
} from '../utils/validations';
import JsonValidator from '../validators/json_validator';
import EventEntryValidator from '../validators/event_entry_validator.js';
import eventSchema from '../validators/schemas/event';
import deliveredSchema from '../../src/validators/schemas/custom/com.ambrosus.delivered.json';
import scanSchema from '../../src/validators/schemas/custom/com.ambrosus.scan.json';
import {put, pick} from '../utils/dict_utils';
import {InvalidParametersError} from '../errors/errors';



export default class EntityBuilder {
  constructor(identityManager) {
    this.eventValidators = [
      new JsonValidator(eventSchema),
      new EventEntryValidator('com.ambrosus.delivered', new JsonValidator(deliveredSchema)),
      new EventEntryValidator('com.ambrosus.scan', new JsonValidator(scanSchema))
    ];
    this.identityManager = identityManager;
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
    validateFieldsConstrainedToSet(asset, ['content', 'assetId']);

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
    validateFieldsConstrainedToSet(event, ['content', 'eventId']);
    validateNonNegativeInteger(event.content.idData.accessLevel, `Access level should be a non-negative integer, instead got ${event.content.idData.accessLevel}`);
    this.identityManager.validateSignature(event.content.idData.createdBy, event.content.signature, event.content.idData);
  }

  stubForEvent(event) {
    return pick(event, 'content.data');
  }

  setBundle(entity, bundle) {
    return put(entity, 'metadata.bundleId', bundle);
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
    const eventStubs = events.map((event) => this.stubForEvent(event));
    const entries = [
      ...assets,
      ...eventStubs
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
    const allowedParametersList = ['assetId', 'fromTimestamp', 'toTimestamp', 'page', 'perPage', 'createdBy'];
    const invalidFields = Object.keys(params).filter((key) => !allowedParametersList.includes(key));
    if (invalidFields.length > 0) {
      throw new InvalidParametersError(`Some parameters (${invalidFields.join(',')}) are not supported`);
    }

    params.fromTimestamp = validateIntegerParameterAndCast(params.fromTimestamp, 'fromTimestamp');
    params.toTimestamp = validateIntegerParameterAndCast(params.toTimestamp, 'toTimestamp');
    params.page = validateIntegerParameterAndCast(params.page, 'page');
    params.perPage = validateIntegerParameterAndCast(params.perPage, 'perPage');

    return params;
  }
}
