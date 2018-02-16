import {validatePathsNotEmpty, validateFieldsConstrainedToSet} from '../utils/validations';
import {put} from '..//utils/dict_utils';

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
}
