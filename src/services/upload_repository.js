/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


import {ValidationError} from '../errors/errors';
import {Role} from './roles_repository';
import {InsufficientFundsToUploadBundleError} from 'ambrosus-node-contracts';

export default class UploadRepository {
  constructor(web3, identityManager, uploadsActions, shelteringWrapper, rolesWrapper, configWrapper, sentry) {
    this.web3 = web3;
    this.identityManager = identityManager;
    this.uploadsActions = uploadsActions;
    this.shelteringWrapper = shelteringWrapper;
    this.rolesWrapper = rolesWrapper;
    this.configWrapper = configWrapper;
    this.sentry = sentry;
  }

  async ensureBundleIsUploaded(bundleId, storagePeriods) {
    await this.validateNodeIsOnboardedAsHermes();

    const previousUploader = await this.shelteringWrapper.getBundleUploader(bundleId);
    if (this.isEmptyAddress(previousUploader)) {
      return this.receiptWithResult(this.uploadsActions.uploadBundle(bundleId, storagePeriods), 'Bundle has been uploaded');
    }
    if (this.identityManager.nodeAddress() === previousUploader) {
      return this.receiptWithResult(this.uploadsActions.getBundleUploadData(bundleId), 'Bundle was already uploaded, updated metadata from chain');
    }
    throw new Error('Bundle was already uploaded by a different HERMES node');
  }

  async receiptWithResult(uploadReceiptPromise, uploadResult) {
    try {
      const uploadReceipt = await uploadReceiptPromise;
      this.handleLowBalanceWarning(uploadReceipt);
      return {
        ...uploadReceipt,
        uploadResult
      };
    } catch (error) {
      if (error instanceof InsufficientFundsToUploadBundleError) {
        this.sentry.captureException(error);
      }
      throw error;
    }
  }

  handleLowBalanceWarning(uploadReceipt) {
    if (uploadReceipt.lowBalanceWarning) {
      this.sentry.captureMessage(
        `Hermes low balance warning triggered. Balance: ${uploadReceipt.approximateBalanceAfterUpload}`,
        this.sentry.Severity.Warning
      );
    }
  }

  isEmptyAddress(address) {
    const emptyAddressRegex = /^0x0+$/gi;
    return emptyAddressRegex.test(address);
  }

  async validateNodeIsOnboardedAsHermes() {
    const uploaderRole = new Role(await this.rolesWrapper.onboardedRole(this.identityManager.nodeAddress()));
    if (!uploaderRole.is(Role.HERMES)) {
      throw new Error('Node is not onboarded as a HERMES');
    }
  }

  async getBundleChainData(bundleId) {
    return this.uploadsActions.getBundleUploadData(bundleId);
  }

  async isSheltering(bundleId) {
    return this.shelteringWrapper.isSheltering(bundleId);
  }

  async bundleExpirationDateInMs(bundleId) {
    return Number(await this.shelteringWrapper.shelteringExpirationDate(bundleId)) * 1000;
  }

  async bundleItemsCountLimit() {
    return this.configWrapper.bundleSizeLimit();
  }

  async verifyBundle(bundle) {
    const bundleItemsCountLimit = await this.bundleItemsCountLimit();
    if (bundle.content.entries.length > bundleItemsCountLimit) {
      throw new ValidationError('Bundle size surpasses the limit');
    }
  }

  async composeBundleMetadataFromBlockchain(bundleId) {
    const bundleUploadData = await this.uploadsActions.getBundleUploadData(bundleId);
    if (bundleUploadData === null) {
      throw new ValidationError(`Bundle with id=${bundleId} has not been uploaded`);
    }
    const bundleStoragePeriods = await this.shelteringWrapper.bundleStoragePeriods(bundleId);
    return {
      bundleId,
      bundleTransactionHash: bundleUploadData.transactionHash,
      bundleProofBlock: bundleUploadData.blockNumber,
      bundleUploadTimestamp: bundleUploadData.timestamp,
      storagePeriods: bundleStoragePeriods
    };
  }
}
