import {NotFoundError} from '../errors/errors';

export default class DataModelEngine {
  constructor(identityManager, entityBuilder, entityRepository, accountRepository) {
    this.identityManager = identityManager;    
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.accountRepository = accountRepository;
  }

  createAccount() {
    const account = this.identityManager.createKeyPair();
    this.accountRepository.store(account);
    return account;
  }

  async createAsset(asset) {
    this.entityBuilder.validateAsset(asset);
    
    let augmentedAsset = this.entityBuilder.regenerateAssetId(asset);
    augmentedAsset = this.entityBuilder.setAssetBundle(augmentedAsset, null);

    await this.entityRepository.storeAsset(augmentedAsset);
    
    return augmentedAsset;
  }

  async getAsset(assetId) {
    const asset = await this.entityRepository.getAsset(assetId);
    if (asset === null) {
      throw new NotFoundError(`No asset with id = ${assetId} found`);
    }
    return asset;
  }
}
