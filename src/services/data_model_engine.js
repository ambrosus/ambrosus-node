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
    if (tokenData.createdBy.toLowerCase() !== accountRequest.createdBy.toLowerCase()) {
      throw new AuthenticationError('Session user and createdBy mismatch.');
    }
    const creatorAccount = await this.getAccount(accountRequest.createdBy, tokenData);
    
    this.accountAccessDefinitions.ensureHasPermission(creatorAccount, 'create_account');
    const account = this.identityManager.createKeyPair();
    const accountWithPermissions = {
      ...account,
      permissions: accountRequest.permissions,
      createdBy : tokenData.createdBy
    };
    await this.accountRepository.store(accountWithPermissions);
    return accountWithPermissions;
  }

  async getAccount(address, tokenData) {
    const sender = await this.accountRepository.get(tokenData.createdBy);
    if (!sender) {
      throw new PermissionError(`Sender account ${address} not found.`);
    }
    const result = await this.accountRepository.get(address);
    if (!result) {
      throw new NotFoundError(`Account ${address} not found.`);
    }
    return result;
  }

  async createAsset(asset) {
    this.entityBuilder.validateAsset(asset);
    const {createdBy: creatorAddress} = asset.content.idData;

    const creatorAccount = await this.accountRepository.get(creatorAddress);
    if (creatorAccount === null) {
      throw new PermissionError(`Address ${creatorAddress} doesn't exist`);
    }
    this.accountAccessDefinitions.ensureHasPermission(creatorAccount, 'create_entity');

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
    const {createdBy: creatorAddress, assetId} = event.content.idData;

    const creatorAccount = await this.accountRepository.get(creatorAddress);
    if (creatorAccount === null) {
      throw new PermissionError(`Address ${creatorAddress} doesn't exist`);
    }
    this.accountAccessDefinitions.ensureHasPermission(creatorAccount, 'create_entity');

    if (await this.entityRepository.getAsset(assetId) === null) {
      throw new InvalidParametersError(`Target asset with id=${assetId} doesn't exist`);
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

    const {blockNumber} = await this.proofRepository.uploadProof(newBundle.bundleId);

    await this.entityRepository.storeBundleProofBlock(newBundle.bundleId, blockNumber);

    return newBundle;
  }
}
