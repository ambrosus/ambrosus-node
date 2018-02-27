import {NotFoundError, InvalidParametersError, PermissionError} from '../errors/errors';

export default class DataModelEngine {
  constructor(identityManager, entityBuilder, entityRepository, accountRepository, accountAccessDefinitions,
    tokenAuthenticator) {
    this.identityManager = identityManager;
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.accountRepository = accountRepository;
    this.accountAccessDefinitions = accountAccessDefinitions;
    this.tokenAuthenticator = tokenAuthenticator;
  }

  async createAdminAccount(account = this.identityManager.createKeyPair()) {
    const accounts = await this.accountRepository.count();
    if (accounts > 0) {
      throw new Error('Admin account already exist.');
    }
    const accountWithPermissions = {
      ...account,
      permissions: this.accountAccessDefinitions.defaultAdminPermissions()
    };
    await this.accountRepository.store(accountWithPermissions);
    return account;
  }

  async createAccount(accountRequest) {
    this.accountAccessDefinitions.validateNewAccountRequest(accountRequest);
    const creatorAccount = await this.getAccount(accountRequest.idData.createdBy);
    this.accountAccessDefinitions.ensureHasPermission(creatorAccount, 'create_account');
    const account = this.identityManager.createKeyPair();
    const accountWithPermissions = {
      ...account,
      permissions: accountRequest.idData.permissions
    };
    await this.accountRepository.store(accountWithPermissions);
    return account;
  }

  async getAccount(address) {
    const result = await this.accountRepository.get(address);
    if (!result) {
      throw new NotFoundError(`Account ${address} not found.`);
    }
    return result;
  }

  async createAsset(asset) {
    this.entityBuilder.validateAsset(asset);

    if (await this.accountRepository.get(asset.content.idData.createdBy) === null) {
      throw new PermissionError(`Address ${asset.content.idData.createdBy} doesn't exist`);
    }

    const augmentedAsset = this.entityBuilder.setBundle(asset, null);

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

    if (await this.accountRepository.get(event.content.idData.createdBy) === null) {
      throw new PermissionError(`Address ${event.content.idData.createdBy} doesn't exist`);
    }

    if (await this.entityRepository.getAsset(event.content.idData.assetId) === null) {
      throw new InvalidParametersError(`Target asset with id=${event.content.idData.assetId} doesn't exist`);
    }

    const augmentedEvent = this.entityBuilder.setBundle(event, null);

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

  async findEvents(params) {
    return await this.entityRepository.findEvents(params);
  }

  async finaliseBundle() {
    const assets = await this.entityRepository.getAssetsWithoutBundle();
    const events = await this.entityRepository.getEventsWithoutBundle();

    const nodeSecret = await this.identityManager.nodeSecret();
    const newBundle = this.entityBuilder.assembleBundle(assets, events, Date.now(), nodeSecret);

    await this.entityRepository.storeBundle(newBundle);

    const {bundleId} = newBundle;
    for (const asset of assets) {
      const updatedAsset = this.entityBuilder.setBundle(asset, bundleId);
      await this.entityRepository.storeAsset(updatedAsset);
    }
    for (const event of events) {
      const updatedEvent = this.entityBuilder.setBundle(event, bundleId);
      await this.entityRepository.storeEvent(updatedEvent);
    }

    return newBundle;
  }
}
