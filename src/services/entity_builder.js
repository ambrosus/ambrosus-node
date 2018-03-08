import {validatePathsNotEmpty, validateFieldsConstrainedToSet, validateIntegerParameterAndCast} from '../utils/validations';

import {put, pick} from '../utils/dict_utils';
import {InvalidParametersError} from '../errors/errors';

export default class EntityBuilder {
  constructor(identityManager) {
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
      'content.data'
    ]);
    validateFieldsConstrainedToSet(event, ['content', 'eventId']);

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
    const allowedParametersList = ['assetId', 'fromTimestamp', 'toTimestamp', 'page', 'perPage'];
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
