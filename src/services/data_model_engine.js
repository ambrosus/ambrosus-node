/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {NotFoundError, PermissionError, ValidationError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';
import {pick, put} from '../utils/dict_utils';
import allPermissions from '../utils/all_permissions';
import BundleStatuses from '../utils/bundle_statuses';
import removeDuplicates from '../utils/sutils.js';

export default class DataModelEngine {
  constructor({identityManager, tokenAuthenticator, entityBuilder, entityRepository, bundleDownloader, bundleBuilder, bundleRepository, accountRepository, operationalModeRepository, findEventQueryObjectFactory, findAccountQueryObjectFactory, findAssetQueryObjectFactory, accountAccessDefinitions, mongoClient, uploadRepository, rolesRepository, workerLogRepository, organizationRepository}) {
    this.identityManager = identityManager;
    this.tokenAuthenticator = tokenAuthenticator;
    this.entityBuilder = entityBuilder;
    this.entityRepository = entityRepository;
    this.bundleDownloader = bundleDownloader;
    this.bundleBuilder = bundleBuilder;
    this.bundleRepository = bundleRepository;
    this.accountRepository = accountRepository;
    this.operationalModeRepository = operationalModeRepository;
    this.findEventQueryObjectFactory = findEventQueryObjectFactory;
    this.findAccountQueryObjectFactory = findAccountQueryObjectFactory;
    this.findAssetQueryObjectFactory = findAssetQueryObjectFactory;
    this.accountAccessDefinitions = accountAccessDefinitions;
    this.mongoClient = mongoClient;
    this.uploadRepository = uploadRepository;
    this.rolesRepository = rolesRepository;
    this.workerLogRepository = workerLogRepository;
    this.organizationRepository = organizationRepository;
  }

  async addAdminAccount(address) {
    let internalAddress = address;

    if (internalAddress === undefined) {
      internalAddress = await this.identityManager.adminAddress();
    }

    const existingAccount = await this.accountRepository.get(internalAddress);
    if (existingAccount) {
      return existingAccount;
    }

    const account = this.accountAccessDefinitions.defaultAdminAccount(internalAddress);
    await this.accountRepository.store(account);
    return account;
  }

  async addAccount(accountRequest, tokenData) {
    await this.accountAccessDefinitions.ensureCanAddAccount(tokenData.createdBy, accountRequest);

    const accountToStore = {
      address: accountRequest.address,
      active: true,
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

    const account = await this.accountRepository.get(address);
    if (!account) {
      throw new NotFoundError(`Account ${address} not found.`);
    }

    await this.accountAccessDefinitions.ensureCanViewAccount(tokenData.createdBy, account);

    return account;
  }

  async findAccounts(params, tokenData) {
    const requestedBy = await this.accountRepository.get(tokenData.createdBy);

    if (requestedBy === null) {
      throw new PermissionError(`Token account not found.`);
    }

    this.accountAccessDefinitions.ensureActiveAccount(requestedBy);

    if (!this.accountAccessDefinitions.hasPermission(requestedBy, allPermissions.superAccount)) {
      params.organization = requestedBy.organization;
    }

    const validatedParams = this.accountAccessDefinitions.validateAndCastFindAccountParams(params);
    await this.accountAccessDefinitions.ensureHasPermission(tokenData.createdBy, allPermissions.manageAccounts);
    const findAccountQueryObject = this.findAccountQueryObjectFactory.create(validatedParams);
    return findAccountQueryObject.execute();
  }

  async modifyAccount(accountToChangeAddress, accountModificationRequest, tokenData) {
    const accountToChange = await this.getAccount(accountToChangeAddress, tokenData);
    await this.accountAccessDefinitions.ensureCanModifyAccount(tokenData.createdBy, accountToChange, accountModificationRequest);

    if (accountModificationRequest.permissions !== undefined) {
      accountModificationRequest.permissions = removeDuplicates(accountModificationRequest.permissions);
    }

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
    const bundle = await this.bundleRepository.getBundle(bundleId);
    if (bundle === null) {
      throw new NotFoundError(`No bundle with id = ${bundleId} found`);
    }
    return bundle;
  }

  async getBundleStream(bundleId) {
    const bundle = await this.bundleRepository.getBundleStream(bundleId);
    if (bundle === null) {
      throw new NotFoundError(`No bundle with id = ${bundleId} found`);
    }
    return bundle;
  }

  async getBundleMetadata(bundleId) {
    const metadata = await this.bundleRepository.getBundleMetadata(bundleId);
    if (metadata === null) {
      throw new NotFoundError(`No metadata found for bundleId = ${bundleId}`);
    }
    return metadata;
  }

  async prepareBundleCandidate(bundleStubId) {
    const bundleItemsCountLimit = parseInt(await this.uploadRepository.bundleItemsCountLimit(), 10);
    const notBundled = await this.entityRepository.fetchEntitiesForBundling(bundleStubId, bundleItemsCountLimit);

    const nodeSecret = await this.identityManager.nodePrivateKey();
    return this.bundleBuilder.assembleBundle(notBundled.assets, notBundled.events, getTimestamp(), nodeSecret);
  }

  async acceptBundleCandidate(newBundle, bundleStubId, storagePeriods) {
    await this.bundleRepository.storeBundle(newBundle, storagePeriods);
    await this.entityRepository.markEntitiesAsBundled(bundleStubId, newBundle.bundleId);

    return newBundle;
  }

  async rejectBundleCandidate(bundleStubId) {
    await this.entityRepository.discardBundling(bundleStubId);
  }

  async uploadAcceptedBundleCandidates(uploadProgressCallbacks = {success: async () => {}, fail: async () => {}}) {
    const waitingBundlesMetadata = await this.bundleRepository.findBundlesWaitingForUpload();
    for (const {bundleId, storagePeriods} of waitingBundlesMetadata) {
      try {
        const {blockNumber, transactionHash, timestamp, uploadResult} = await this.uploadRepository.ensureBundleIsUploaded(bundleId, storagePeriods);
        await this.entityRepository.storeBundleProofMetadata(bundleId, blockNumber, timestamp, transactionHash);
        await this.bundleRepository.storeBundleProofMetadata(bundleId, blockNumber, timestamp, transactionHash);
        await uploadProgressCallbacks.success(bundleId, uploadResult);
      } catch (err) {
        await uploadProgressCallbacks.fail(bundleId, err);
        break;
      }
    }
  }

  async downloadBundle(bundleId, sheltererId, challengeExpirationTime) {
    if (await this.bundleRepository.isBundleSheltered(bundleId)) {
      throw new Error('Bundle is already sheltered');
    }

    const initialMetadata = await this.uploadRepository.composeBundleMetadataFromBlockchain(bundleId);
    await this.bundleRepository.createBundleMetadata(bundleId, initialMetadata.storagePeriods, BundleStatuses.shelteringCandidate, {holdUntil: new Date(challengeExpirationTime)});

    const nodeUrl = await this.rolesRepository.nodeUrl(sheltererId);

    const downloadedMetadata = await this.bundleDownloader.downloadBundleMetadata(nodeUrl, bundleId);
    if (!downloadedMetadata) {
      throw new Error('Could not fetch the bundle metadata from the shelterer');
    }
    this.bundleBuilder.validateBundleMetadata(downloadedMetadata);

    try {
      await this.downloadAndValidateBundleBody(nodeUrl, bundleId);
    } catch (err) {
      if (err instanceof ValidationError) {
        await this.bundleRepository.setBundleRepository(bundleId, BundleStatuses.cleanup);
        throw new Error(`Bundle failed to validate: ${err.message || err}`);
      }
      throw new Error(`Could not fetch the bundle from the shelterer: ${err.message || err}`);
    }

    await this.bundleRepository.setBundleRepository(bundleId, BundleStatuses.downloaded, {nodeUrl, holdUntil: new Date(challengeExpirationTime)});
    const additionalMetadataFields = this.bundleRepository.additionalMetadataFields(initialMetadata, downloadedMetadata);
    await this.bundleRepository.updateBundleMetadata(bundleId, additionalMetadataFields);

    return {...additionalMetadataFields, ...initialMetadata};
  }

  async downloadAndValidateBundleBody(nodeUrl, bundleId) {
    const downloadStream = await this.bundleDownloader.openBundleDownloadStream(nodeUrl, bundleId);
    const writeStream = await this.bundleRepository.openBundleWriteStream(bundleId);
    const bundleItemsCountLimit = await this.uploadRepository.bundleItemsCountLimit();
    await this.bundleBuilder.validateStreamedBundle(downloadStream, writeStream, bundleItemsCountLimit);
  }

  async markBundleAsSheltered(bundleId) {
    const bundleExpirationDate = await this.uploadRepository.bundleExpirationDateInMs(bundleId);
    await this.bundleRepository.setBundleRepository(bundleId, BundleStatuses.sheltered, {holdUntil: new Date(bundleExpirationDate)});
  }

  /**
   * @returns {Promise<int>}: removed bundles count
   */
  async cleanupOutdatedBundles() {
    await this.bundleRepository.findOutdatedBundles();
    return this.bundleRepository.cleanupBundles();
  }

  async getWorkerLogs(logsCount = 10) {
    return await this.workerLogRepository.getLogs(logsCount);
  }
}
