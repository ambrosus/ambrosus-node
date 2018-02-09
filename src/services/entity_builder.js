import {validatePathsNotEmpty, validateFieldsConstrainedToSet} from '../utils/validations';
import {put} from '..//utils/dict_utils';

export default class EntityBuilder {
  constructor(identityManager) {
    this.identityManager = identityManager;
  }

  validateAsset(asset) {
    validatePathsNotEmpty(asset, [
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

  regenerateAssetId(asset) {
    return put(asset, 'assetId', this.identityManager.calculateHash(asset.content));
  }
}
