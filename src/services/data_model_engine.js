import {NotFoundError, InvalidParametersError, PermissionError, ValidationError} from '../errors/errors';
import {validatePathsNotEmpty} from '../utils/validations';

export default class DataModelEngine {
  constructor(identityManager, entityBuilder, entityRepository, accountRepository, accountAccessDefinitions) {
    this.identityManager = identityManager;
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.accountRepository = accountRepository;
    this.accountAccessDefinitions = accountAccessDefinitions;
  }

  async createAdminAccount(account = this.identityManager.createKeyPair()) {
    const accounts = await this.accountRepository.count();
    if (accounts > 0) {
      throw new Error('Admin account arleady exist.');
    }
    await this.accountRepository.store(account);
    await this.accountAccessDefinitions.createAdminAccountPermissions(account.address);
    return account;
  }

  async createAccount(idData, signature) {
    this.identityManager.validateSignature(idData.createdBy, signature, idData);
    if (!await this.accountAccessDefinitions.checkPermission(idData.createdBy, 'create_account')) {
      throw new PermissionError(`Creating new accounts forbidden for ${idData.createdBy}`);
    }
    const account = this.identityManager.createKeyPair();
    const creatorAccount = await this.accountRepository.get(idData.createdBy);
    if (!creatorAccount) {
      throw new PermissionError('Account creator not specified');
    }
    await this.accountRepository.store(account);
    return account;
  }

  async updatePermissions(idData, signature) {
    validatePathsNotEmpty(idData, ['address', 'createdBy']);
    if (!Array.isArray(idData.permissions)) {
      throw new ValidationError('Permissions should be provided as an array');
    }

    this.identityManager.validateSignature(idData.createdBy, signature, idData);
    await this.accountAccessDefinitions.setPermissions(idData.address, idData.permissions, idData.createdBy);
    return {
      address: idData.address,
      permissions: idData.permissions
    };
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

    if (await this.accountRepository.get(event.content.idData.createdBy) === null) {
      throw new PermissionError(`Address ${event.content.idData.createdBy} doesn't exist`);
    }

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

  async findEvents() {
    return await this.entityRepository.findEvents();
  }
}
