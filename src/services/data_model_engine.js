import {NotFoundError, InvalidParametersError, PermissionError} from '../errors/errors';

export default class DataModelEngine {
  constructor(identityManager, entityBuilder, entityRepository, accountRepository) {
    this.identityManager = identityManager;
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.accountRepository = accountRepository;
  }

  async createAdminAccount(account = this.identityManager.createKeyPair()) {
    const accounts = await this.accountRepository.count();
    if (accounts > 0) {
      throw new PermissionError('Admin account arleady exist.');
    }    
    await this.accountRepository.store(account);
    return account;
  }

  async createAccount(idData, signature) {
    this.identityManager.validateSignature(idData.createdBy, signature, idData);    
    const account = this.identityManager.createKeyPair();
    const creatorAccount = await this.accountRepository.get(idData.createdBy);
    if (!creatorAccount) {
      throw new NotFoundError();
    }
    await this.accountRepository.store(account);
    return account;
  }

  async getAccount(address) {
    return this.accountRepository.get(address);
  }

  async createAsset(asset) {
    this.entityBuilder.validateAsset(asset);

    const augmentedAsset = this.entityBuilder.setAssetBundle(asset, null);

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

    if (await this.entityRepository.getAsset(event.content.idData.assetId) === null) {
      throw new InvalidParametersError(`Target asset with id=${event.content.idData.assetId} doesn't exist`);
    }
    
    const augmentedEvent = this.entityBuilder.setEventBundle(event, null);
    await this.entityRepository.storeEvent(augmentedEvent);
    return augmentedEvent;
  }

  async getEvent(eventId) {
    const event = await this.entityRepository.getEvent(eventId);
    if (event === null) {
      throw new NotFoundError(`No event with id = ${eventId} found`);
    }
    return event;
  }
}
