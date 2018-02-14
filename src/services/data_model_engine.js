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
}
