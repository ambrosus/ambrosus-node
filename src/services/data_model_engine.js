import {NotFoundError, InvalidParametersError, PermissionError, ValidationError} from '../errors/errors';
import {validatePathsNotEmpty} from '../utils/validations';

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
      throw new Error('Admin account arleady exist.');
    }    
    await this.accountRepository.store(account);
    return account;
  }

  async getAndValidateCreator(idData, signature) {
    this.identityManager.validateSignature(idData.createdBy, signature, idData);        
    const creatorAccount = await this.accountRepository.get(idData.createdBy);
    if (!creatorAccount) {
      throw new PermissionError('Account creator not specified');
    }
    return creatorAccount;
  }

  validateNoReplyAttack(creatorAccount, idData) {    
    const lastActionAt = parseInt(creatorAccount.lastActionAt, 10);
    const timestamp = parseInt(idData.timestamp, 10);
    if (lastActionAt && lastActionAt <= timestamp) {
      throw new ValidationError('operation timestamp is smaller than last action timestamp');
    }
  }

  validatecreateAccountRequest(idData) {
    validatePathsNotEmpty(idData, [
      'createdBy',
      'timestamp'
    ]);
  }

  async createAccount(idData, signature) {
    this.validatecreateAccountRequest(idData);
    const creatorAccount = await this.getAndValidateCreator(idData, signature);
    this. validateNoReplyAttack(creatorAccount, idData);    
    const account = this.identityManager.createKeyPair();    
    await this.accountRepository.store({timestamp: idData.timestamp, ...account});    
    await this.accountRepository.update(idData.createdBy, {lastActionAt: idData.timestamp});
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
