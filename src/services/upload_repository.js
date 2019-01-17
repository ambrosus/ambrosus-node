/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


import {ValidationError} from '../errors/errors';
import {Role} from './roles_repository';

export default class UploadRepository {
  constructor(web3, identityManager, uploadsActions, shelteringWrapper, rolesWrapper, feesWrapper, configWrapper, lowFundsWarningAmount, sentry) {
    this.web3 = web3;
    this.identityManager = identityManager;
    this.uploadsActions = uploadsActions;
    this.feesWrapper = feesWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.configWrapper = configWrapper;
    this.rolesWrapper = rolesWrapper;
    this.lowFundsWarningAmount = lowFundsWarningAmount;
    this.sentry = sentry;
  }

  async ensureBundleIsUploaded(bundleId, storagePeriods) {
    await this.validateNodeIsOnboardedAsHermes();

    const previousUploader = await this.shelteringWrapper.getBundleUploader(bundleId);
    if (this.isEmptyAddress(previousUploader)) {
      return this.receiptWithResult(this.uploadsActions.uploadBundle(bundleId, storagePeriods, this.lowFundsWarningAmount), 'Bundle has been uploaded');
    }
    if (this.identityManager.nodeAddress() === previousUploader) {
      return this.receiptWithResult(this.uploadsActions.getBundleUploadData(bundleId), 'Bundle was already uploaded, updated metadata from chain');
    }
    throw new Error('Bundle was already uploaded by a different HERMES node');
  }

  async receiptWithResult(uploadReceiptPromise, uploadResult) {
    const uploadReceipt = await uploadReceiptPromise;
    this.handleErrors(uploadReceipt);
    this.handleWarnings(uploadReceipt);
    return {
      ...uploadReceipt,
      uploadResult
    };
  }

  handleErrors(uploadReceipt) {
    if (uploadReceipt.error) {
      const err = new Error(uploadReceipt.error);
      this.sentry.captureException(err);
      throw err;
    }
  }

  handleWarnings(uploadReceipt) {
    if (uploadReceipt.warning) {
      this.sentry.captureMessage(
        uploadReceipt.warning,
        this.sentry.Severity.Warning
      );
    }
  }

  isEmptyAddress(address) {
    const emptyAddressRegex = /^0x0+$/gi;
    return emptyAddressRegex.test(address);
  }

  // async validateEnoughFundsForUploadFee(storagePeriods) {
  //   const fee = await this.feesWrapper.feeForUpload(storagePeriods);
  //   if (!await this.checkIfEnoughFunds(fee)) {
  //     const err = new Error(`Insufficient funds: need at least ${fee} to upload the bundle`);
  //     this.sentry.captureException(err);
  //     throw err;
  //   }
  // }

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

  async expirationDate(bundleId) {
    return this.shelteringWrapper.shelteringExpirationDate(bundleId);
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

  // async checkIfEnoughFunds(requiredBalance) {
  //   const balance = new BN(await this.web3.eth.getBalance(this.identityManager.nodeAddress()));
  //   if (balance.lte(new BN(this.lowFundsWarningAmount))) {
  //     this.sentry.captureMessage(
  //       `Hermes low balance warning triggered. Balance: ${balance}`,
  //       sentry.Severity.Warning
  //     );
  //   }
  //   return balance.gte(new BN(requiredBalance));
  // }
  async complementBundleMetadata(bundleMetadata) {
    const bundleUploadData = await this.uploadsActions.getBundleUploadData(bundleMetadata.bundleId);
    if (bundleUploadData === null) {
      throw new ValidationError(`Bundle with id=${bundleMetadata.bundleId} has not been uploaded`);
    }
    const bundleStoragePeriods = await this.shelteringWrapper.bundleStoragePeriods(bundleMetadata.bundleId);
    return {
      ...bundleMetadata,
      bundleTransactionHash: bundleUploadData.transactionHash,
      bundleProofBlock: bundleUploadData.blockNumber,
      bundleUploadTimestamp: bundleUploadData.timestamp,
      storagePeriods: bundleStoragePeriods
    };
  }
}
