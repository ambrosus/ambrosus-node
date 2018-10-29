/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


import {ValidationError} from '../errors/errors';
import {Role} from './roles_repository';
import BN from 'bn.js';

export default class UploadRepository {
  constructor(web3, identityManager, uploadsActions, shelteringWrapper, rolesWrapper, feesWrapper, configWrapper) {
    this.web3 = web3;
    this.identityManager = identityManager;
    this.uploadsActions = uploadsActions;
    this.feesWrapper = feesWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.configWrapper = configWrapper;
    this.rolesWrapper = rolesWrapper;
  }

  async uploadBundle(bundleId, storagePeriods) {
    const uploaderRole = new Role(await this.rolesWrapper.onboardedRole(this.identityManager.nodeAddress()));
    if (!uploaderRole.is(Role.HERMES)) {
      throw new Error('Node is not onboarded as a HERMES');
    }

    const fee = await this.feesWrapper.feeForUpload(storagePeriods);
    if (!await this.checkIfEnoughFunds(fee)) {
      throw new Error(`Insufficient funds: need at least ${fee} to upload the bundle`);
    }

    const previousUploader = await this.shelteringWrapper.getBundleUploader(bundleId);
    const emptyAddressRegex = /^0x0+$/gi;
    if (!emptyAddressRegex.test(previousUploader)) {
      throw new Error(`Bundle was already uploaded`);
    }

    return this.uploadsActions.uploadBundle(bundleId, storagePeriods);
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

  async checkIfEnoughFunds(requiredBalance) {
    const balance = new BN(await this.web3.eth.getBalance(this.identityManager.nodeAddress()));
    return balance.gte(new BN(requiredBalance));
  }
}
