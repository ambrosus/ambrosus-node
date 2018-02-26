import {validatePathsNotEmpty, validateFieldsConstrainedToSet} from '../utils/validations';

import {put} from '../utils/dict_utils';
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

  setAssetBundle(asset, bundle) {
    return put(asset, 'metadata.bundleId', bundle);
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

  setEventBundle(asset, bundle) {
    return put(asset, 'metadata.bundleId', bundle);
  }

  validateAndCastFindEventsParams(params, allowedParametersList = ['assetId', 'fromTimestamp', 'toTimestamp']) {
    const filteredParams = Object
      .keys(params)
      .filter((key) => allowedParametersList.includes(key))
      .reduce(
        (ret, key) => put(ret, key, params[key]),
        {});

    const invalidFields = Object.keys(params).filter((key) => !allowedParametersList.includes(key));
    if (invalidFields.length > 0) {
      throw new InvalidParametersError(`Some parameters (${invalidFields.join(',')}) are not supported`);
    }

    if (filteredParams.fromTimestamp) {
      if (!isNaN(parseInt(filteredParams.fromTimestamp, 10))) {
        filteredParams.fromTimestamp = parseInt(filteredParams.fromTimestamp, 10);
      } else {
        throw new InvalidParametersError(`Invalid 'fromTimestamp' parameter value`);
      }
    }
    

    if (filteredParams.toTimestamp) {
      if (!isNaN(parseInt(filteredParams.toTimestamp, 10))) {
        filteredParams.toTimestamp = parseInt(filteredParams.toTimestamp, 10);
      } else {
        throw new InvalidParametersError(`Invalid 'toTimestamp' parameter value`);
      }
    }
    
    
    return filteredParams;
  }
}
