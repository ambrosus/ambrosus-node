import {NotFoundError, InvalidParametersError, PermissionError, AuthenticationError} from '../errors/errors';

export default class DataModelEngine {
  constructor(identityManager, tokenAuthenticator, entityBuilder, entityRepository, proofRepository, accountRepository, accountAccessDefinitions) {
    this.identityManager = identityManager;
    this.tokenAuthenticator = tokenAuthenticator;
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.proofRepository = proofRepository;
    this.accountRepository = accountRepository;
    this.accountAccessDefinitions = accountAccessDefinitions;
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

  async createAccount(accountRequest, tokenData) {
    this.accountAccessDefinitions.validateNewAccountRequest(accountRequest);
    if (tokenData.createdBy.toLowerCase() !== accountRequest.idData.createdBy.toLowerCase()) {
      throw new AuthenticationError('Session user and createdBy mismatch.');
    }
    const creatorAccount = await this.getAccount(accountRequest.idData.createdBy, tokenData);
    this.accountAccessDefinitions.ensureHasPermission(creatorAccount, 'create_account');
    const account = this.identityManager.createKeyPair();
    const accountWithPermissions = {
      ...account,
      permissions: accountRequest.idData.permissions
    };
    await this.accountRepository.store(accountWithPermissions);
    return account;
  }

  async getAccount(address, tokenData) {
    this.accountAccessDefinitions.ensureHasPermission(tokenData.createdBy, 'create_account');
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
    const validatedParams = this.entityBuilder.validateAndCastFindEventsParams(params);
    return this.entityRepository.findEvents(validatedParams);
  }

  async getBundle(bundleId) {
    const bundle = await this.entityRepository.getBundle(bundleId);
    if (bundle === null) {
      throw new NotFoundError(`No bundle with id = ${bundleId} found`);
    }
    return bundle;
  }

  async finaliseBundle(bundleStubId) {
    const notBundled = await this.entityRepository.beginBundle(bundleStubId);

    const nodeSecret = await this.identityManager.nodePrivateKey();
    const newBundle = this.entityBuilder.assembleBundle(notBundled.assets, notBundled.events, Date.now(), nodeSecret);

    await this.entityRepository.storeBundle(newBundle);

    await this.entityRepository.endBundle(bundleStubId, newBundle.bundleId);

    await this.proofRepository.uploadProof(newBundle.bundleId);

    return newBundle;
  }
}
