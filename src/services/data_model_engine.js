/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {NotFoundError, InvalidParametersError, PermissionError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';

export default class DataModelEngine {
  constructor(identityManager, tokenAuthenticator, entityBuilder, entityRepository, entityDownloader, proofRepository, accountRepository, findEventQueryObjectFactory, findAccountQueryObjectFactory, findAssetQueryObjectFactory, accountAccessDefinitions) {
    this.identityManager = identityManager;
    this.tokenAuthenticator = tokenAuthenticator;
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.entityDownloader = entityDownloader;
    this.proofRepository = proofRepository;
    this.accountRepository = accountRepository;
    this.findEventQueryObjectFactory = findEventQueryObjectFactory;
    this.findAccountQueryObjectFactory = findAccountQueryObjectFactory;
    this.findAssetQueryObjectFactory = findAssetQueryObjectFactory;
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
      registeredBy: tokenData.createdBy,
      registeredOn: getTimestamp(),
      accessLevel: accountRequest.accessLevel
    };
    await this.accountRepository.store(accountToStore);
    return accountToStore;
  }

  async getAccount(address, tokenData) {
    const sender = await this.accountRepository.get(tokenData.createdBy);
    if (!sender) {
      throw new PermissionError(`Sender account ${tokenData.createdBy} not found.`);
    }
    const result = await this.accountRepository.get(address);
    if (!result) {
      throw new NotFoundError(`Account ${address} not found.`);
    }
    return result;
  }

  async findAccounts(tokenData) {
    await this.accountAccessDefinitions.ensureCanRegisterAccount(tokenData.createdBy);
    const findAccountQueryObject = this.findAccountQueryObjectFactory.create();
    return await findAccountQueryObject.execute();
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

  async findAssets() {
    const findAssetQueryObject = this.findAssetQueryObjectFactory.create();
    return await findAssetQueryObject.execute();
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
    const findEventQueryObject = this.findEventQueryObjectFactory.create(validatedParams, accessLevel);
    return await findEventQueryObject.execute();
  }

  async getBundle(bundleId) {
    const bundle = await this.entityRepository.getBundle(bundleId);
    if (bundle === null) {
      throw new NotFoundError(`No bundle with id = ${bundleId} found`);
    }
    return bundle;
  }

  async finaliseBundle(bundleStubId, bundleSizeLimit) {
    const notBundled = await this.entityRepository.beginBundle(bundleStubId);

    const nodeSecret = await this.identityManager.nodePrivateKey();
    const newBundle = this.entityBuilder.assembleBundle(notBundled.assets, notBundled.events, getTimestamp(), nodeSecret);

    if (newBundle.content.entries.length === 0) {
      return null;
    }

    await this.entityRepository.storeBundle(newBundle);

    await this.entityRepository.endBundle(bundleStubId, newBundle.bundleId, bundleSizeLimit);

    const {blockNumber, transactionHash} = await this.proofRepository.uploadProof(newBundle.bundleId);

    await this.entityRepository.storeBundleProofMetadata(newBundle.bundleId, blockNumber, transactionHash);

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
