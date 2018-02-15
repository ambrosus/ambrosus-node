import {NotFoundError, InvalidParametersError} from '../errors/errors';

export default class DataModelEngine {
  constructor(identityManager, entityBuilder, entityRepository, accountRepository) {
    this.identityManager = identityManager;
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.accountRepository = accountRepository;
  }

  async createAccount() {
    const account = this.identityManager.createKeyPair();
    await this.accountRepository.store(account);
    return account;
  }

  async getAccount(address) {
    return this.accountRepository.get(address);
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

  async createEvent(event) {
    this.entityBuilder.validateEvent(event);

    try {
      await this.entityRepository.getAsset(event.content.idData.assetId);
    } catch (err) {
      throw new InvalidParametersError(`Target asset with id=${event.content.idData.assetId} doesn't exist`);
    }

    const augmentedEvent = this.entityBuilder.setEventBundle(event, null);
    await this.entityRepository.storeEvent(augmentedEvent);
    return augmentedEvent;
  }
}
