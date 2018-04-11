import {NotFoundError, InvalidParametersError, PermissionError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';

export default class DataModelEngine {
  constructor(identityManager, tokenAuthenticator, entityBuilder, entityRepository, entityDownloader, proofRepository, accountRepository, accountAccessDefinitions) {
    this.identityManager = identityManager;
    this.tokenAuthenticator = tokenAuthenticator;
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.entityDownloader = entityDownloader;
    this.proofRepository = proofRepository;
    this.accountRepository = accountRepository;
    this.accountAccessDefinitions = accountAccessDefinitions;
  }

  async addAdminAccount(address = this.identityManager.nodeAddress()) {
    const existingAccount = await this.accountRepository.get(address);
    if (existingAccount) {
      return existingAccount;
    }

    const account = this.accountAccessDefinitions.defaultAdminAccount(address);
    await this.accountRepository.store(account);
    return account;
  }

  async addAccount(accountRequest, tokenData) {
    await this.accountAccessDefinitions.ensureCanRegisterAccount(tokenData.createdBy);
    this.accountAccessDefinitions.validateAddAccountRequest(accountRequest);

    const accountToStore = {
      address: accountRequest.address,
      permissions: accountRequest.permissions,
      registeredBy : tokenData.createdBy,
      accessLevel: accountRequest.accessLevel
    };
    await this.accountRepository.store(accountToStore);
    return accountToStore;
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

  async modifyAccount(accountToChange, accountRequest, tokenData) {
    await this.accountAccessDefinitions.ensureCanRegisterAccount(tokenData.createdBy);
    this.accountAccessDefinitions.validateModifyAccountRequest(accountRequest);
    await this.getAccount(accountToChange, tokenData);
    return await this.accountRepository.update(accountToChange, accountRequest);
  }

  async createAsset(asset) {
    this.entityBuilder.validateAsset(asset);
    const {createdBy: creatorAddress} = asset.content.idData;

    await this.accountAccessDefinitions.ensureCanCreateEntity(creatorAddress);

    const augmentedAsset = this.entityBuilder.setBundle(asset, null);

    if (await this.entityRepository.getAsset(asset.assetId) !== null) {
      throw new InvalidParametersError(`Asset with assetId=${asset.assetId} already exists`);
    }
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

    await this.accountAccessDefinitions.ensureCanCreateEntity(creatorAddress);

    if (await this.entityRepository.getAsset(assetId) === null) {
      throw new InvalidParametersError(`Target asset with id=${assetId} doesn't exist`);
    }

    const augmentedEvent = this.entityBuilder.setBundle(event, null);

    if (await this.entityRepository.getEvent(event.eventId) !== null) {
      throw new InvalidParametersError(`Event with eventId=${event.eventId} already exists`);
    }
    await this.entityRepository.storeEvent(augmentedEvent);

    return augmentedEvent;
  }

  async getEvent(eventId, tokenData) {
    const accessLevel = await this.accountAccessDefinitions.getTokenCreatorAccessLevel(tokenData);
    const event = await this.entityRepository.getEvent(eventId, accessLevel);
    if (event === null) {
      throw new NotFoundError(`No event with id = ${eventId} found`);
    }
    return event;
  }

  async findEvents(params, tokenData) {
    const validatedParams = this.entityBuilder.validateAndCastFindEventsParams(params);
    const accessLevel = await this.accountAccessDefinitions.getTokenCreatorAccessLevel(tokenData);
    return this.entityRepository.findEvents(validatedParams, accessLevel);
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
    const newBundle = this.entityBuilder.assembleBundle(notBundled.assets, notBundled.events, getTimestamp(), nodeSecret);

    await this.entityRepository.storeBundle(newBundle);

    await this.entityRepository.endBundle(bundleStubId, newBundle.bundleId);

    const {blockNumber} = await this.proofRepository.uploadProof(newBundle.bundleId);

    await this.entityRepository.storeBundleProofBlock(newBundle.bundleId, blockNumber);

    return newBundle;
  }

  async downloadBundle(bundleId, vendorId) {
    const processedBundle = await this.entityRepository.getBundle(bundleId);
    if (processedBundle) {
      return processedBundle;
    }
    const vendorUrl = await this.proofRepository.getVendorUrl(vendorId);
    const bundle = await this.entityDownloader.downloadBundle(vendorUrl, bundleId);
    await this.entityRepository.storeBundle(bundle);
    return bundle;
  }
}
