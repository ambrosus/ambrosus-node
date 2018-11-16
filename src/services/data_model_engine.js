/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {NotFoundError, PermissionError, ValidationError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';
import {pick, put} from '../utils/dict_utils';
import allPermissions from '../utils/all_permissions';

export default class DataModelEngine {
  constructor({identityManager, tokenAuthenticator, entityBuilder, entityRepository, entityDownloader, accountRepository, findEventQueryObjectFactory, findAccountQueryObjectFactory, findAssetQueryObjectFactory, accountAccessDefinitions, mongoClient, uploadRepository, rolesRepository, workerLogRepository}) {
    this.identityManager = identityManager;
    this.tokenAuthenticator = tokenAuthenticator;
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.entityDownloader = entityDownloader;
    this.accountRepository = accountRepository;
    this.findEventQueryObjectFactory = findEventQueryObjectFactory;
    this.findAccountQueryObjectFactory = findAccountQueryObjectFactory;
    this.findAssetQueryObjectFactory = findAssetQueryObjectFactory;
    this.accountAccessDefinitions = accountAccessDefinitions;
    this.mongoClient = mongoClient;
    this.uploadRepository = uploadRepository;
    this.rolesRepository = rolesRepository;
    this.workerLogRepository = workerLogRepository;
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
    await this.accountAccessDefinitions.ensureCanAddAccount(tokenData.createdBy, accountRequest);
    const accountToStore = {
      address: accountRequest.address,
      permissions: accountRequest.permissions,
      registeredBy: tokenData.createdBy,
      registeredOn: getTimestamp(),
      accessLevel: accountRequest.accessLevel,
      organization: accountRequest.organization
    };
    if (await this.accountRepository.get(accountToStore.address)) {
      throw new ValidationError(`Account with address ${accountToStore.address} already exists`);
    }
    await this.accountRepository.store(accountToStore);
    return accountToStore;
  }

  async getAccount(address, tokenData) {
    const sender = await this.accountRepository.get(tokenData.createdBy);
    if (!sender) {
      throw new PermissionError(`Sender account ${tokenData.createdBy} not found.`);
    }
    await this.accountAccessDefinitions.ensureHasPermission(tokenData.createdBy, allPermissions.manageAccounts);
    const result = await this.accountRepository.get(address);
    if (!result) {
      throw new NotFoundError(`Account ${address} not found.`);
    }
    return result;
  }

  async findAccounts(params, tokenData) {
    const validatedParams = this.accountAccessDefinitions.validateAndCastFindAccountParams(params);
    await this.accountAccessDefinitions.ensureHasPermission(tokenData.createdBy, allPermissions.manageAccounts);
    const findAccountQueryObject = this.findAccountQueryObjectFactory.create(validatedParams);
    return findAccountQueryObject.execute();
  }

  async modifyAccount(accountToChangeAddress, accountModificationRequest, tokenData) {
    const accountToChange = await this.getAccount(accountToChangeAddress, tokenData);
    await this.accountAccessDefinitions.ensureCanModifyAccount(tokenData.createdBy, accountToChange, accountModificationRequest);
    return this.accountRepository.update(accountToChangeAddress, accountModificationRequest);
  }

  async createAsset(asset) {
    this.entityBuilder.validateAsset(asset);
    const {createdBy: creatorAddress} = asset.content.idData;

    await this.accountAccessDefinitions.ensureCanCreateAsset(creatorAddress);

    const augmentedAsset = this.entityBuilder.setBundle(asset, null);
    const augmentedAssetWithUploadTimestamp = this.entityBuilder.setEntityUploadTimestamp(augmentedAsset);

    if (await this.entityRepository.getAsset(asset.assetId) !== null) {
      throw new ValidationError(`Asset with assetId=${asset.assetId} already exists`);
    }
    await this.entityRepository.storeAsset(augmentedAssetWithUploadTimestamp);

    return augmentedAssetWithUploadTimestamp;
  }

  async getAsset(assetId) {
    const asset = await this.entityRepository.getAsset(assetId);
    if (asset === null) {
      throw new NotFoundError(`No asset with id = ${assetId} found`);
    }
    return asset;
  }

  async selectAssetsIdsByIdentifier(identifier, accessLevel) {
    const findEventQueryObject = this.findEventQueryObjectFactory.create({
      data: {
        type: 'ambrosus.event.identifiers',
        identifiers: {...identifier}
      }
    }, accessLevel ? accessLevel : 0);
    const events = await findEventQueryObject.execute();
    return [...new Set(events.results.map((event) => event.content.idData.assetId))];
  }

  async findAssets(params, tokenData) {
    let validatedParams = this.entityBuilder.validateAndCastFindAssetsParams(params);
    if (validatedParams.identifier) {
      const accessLevel = await this.accountAccessDefinitions.getTokenCreatorAccessLevel(tokenData);
      const consideredAssetIds = await this.selectAssetsIdsByIdentifier(validatedParams.identifier, accessLevel);
      validatedParams = pick(put(validatedParams, 'assetIds', consideredAssetIds), 'identifier');
    }
    const findAssetQueryObject = this.findAssetQueryObjectFactory.create(validatedParams);
    return await findAssetQueryObject.execute();
  }

  async createEvent(event) {
    this.entityBuilder.validateEvent(event);
    const {createdBy: creatorAddress, assetId} = event.content.idData;

    await this.accountAccessDefinitions.ensureCanCreateEvent(creatorAddress, event.content.idData.accessLevel);

    if (await this.entityRepository.getAsset(assetId) === null) {
      throw new ValidationError(`Target asset with id=${assetId} doesn't exist`);
    }

    const augmentedEvent = this.entityBuilder.setBundle(event, null);
    const augmentedEventWithUploadTimestamp = this.entityBuilder.setEntityUploadTimestamp(augmentedEvent);

    if (await this.entityRepository.getEvent(event.eventId) !== null) {
      throw new ValidationError(`Event with eventId=${event.eventId} already exists`);
    }
    await this.entityRepository.storeEvent(augmentedEventWithUploadTimestamp);

    return augmentedEventWithUploadTimestamp;
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

  async prepareBundleCandidate(bundleStubId) {
    const bundleItemsCountLimit = await this.uploadRepository.bundleItemsCountLimit();
    const notBundled = await this.entityRepository.fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit);

    const nodeSecret = await this.identityManager.nodePrivateKey();
    const newBundle = this.entityBuilder.assembleBundle(notBundled.assets, notBundled.events, getTimestamp(), nodeSecret);

    return newBundle;
  }

  async acceptBundleCandidate(newBundle, bundleStubId, storagePeriods) {
    await this.entityRepository.storeBundle(newBundle, storagePeriods);
    await this.entityRepository.markEntitiesAsBundled(bundleStubId, newBundle.bundleId);

    return newBundle;
  }

  async rejectBundleCandidate(bundleStubId) {
    await this.entityRepository.discardBundling(bundleStubId);
  }

  async rejectAllBundleCandidate() {
    await this.entityRepository.discardAllBundling();
  }

  async uploadAcceptedBundleCandidates() {
    const waitingBundles = await this.entityRepository.findBundlesWaitingForUpload();
    const summary = {
      ok: [],
      failed: {}
    };
    for (const waitingBundle of waitingBundles) {
      try {
        const {blockNumber, transactionHash} = await this.uploadRepository.uploadBundle(waitingBundle.bundleId, waitingBundle.metadata.storagePeriods);
        await this.entityRepository.storeBundleProofMetadata(waitingBundle.bundleId, blockNumber, transactionHash);
        summary.ok.push(waitingBundle.bundleId);
      } catch (err) {
        summary.failed[waitingBundle.bundleId] = err.message;
      }
    }
    return summary;
  }

  async downloadBundle(bundleId, sheltererId) {
    const nodeUrl = await this.rolesRepository.nodeUrl(sheltererId);
    const bundle = await this.entityDownloader.downloadBundle(nodeUrl, bundleId);
    if (!bundle) {
      throw new Error('Could not fetch the bundle from the shelterer');
    }
    this.entityBuilder.validateBundle(bundle);
    await this.uploadRepository.verifyBundle(bundle);
    await this.entityRepository.storeBundle(bundle);
    return bundle;
  }

  async updateShelteringExpirationDate(bundleId) {
    const expirationDate = await this.uploadRepository.expirationDate(bundleId);
    await this.entityRepository.storeBundleShelteringExpirationDate(bundleId, expirationDate);
  }

  async cleanupBundles() {
    const expiredBundleIds = await this.entityRepository.getExpiredBundleIds();
    const isSheltering = await Promise.all(expiredBundleIds.map((bundleId) => this.uploadRepository.isSheltering(bundleId)));
    const toBeRemoved = expiredBundleIds.filter((bundleId, ind) => !isSheltering[ind]);
    const toBeUpdated = expiredBundleIds.filter((bundleId, ind) => isSheltering[ind]);
    await this.entityRepository.deleteBundles(toBeRemoved);
    await Promise.all(toBeUpdated.map((bundleId) => this.updateShelteringExpirationDate(bundleId)));
    return toBeRemoved;
  }

  async getWorkerLogs(logsCount = 10) {
    return await this.workerLogRepository.getLogs(logsCount);
  }
}
