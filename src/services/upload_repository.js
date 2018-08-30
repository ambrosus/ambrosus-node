/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


import {ValidationError} from '../errors/errors';
import {Role} from './roles_repository';

export default class UploadRepository {
  constructor(uploadsWrapper, shelteringWrapper, rolesWrapper, feesWrapper, configWrapper) {
    this.uploadsWrapper = uploadsWrapper;
    this.feesWrapper = feesWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.configWrapper = configWrapper;
    this.rolesWrapper = rolesWrapper;
  }

  async uploadBundle(bundleId, storagePeriods) {
    const fee = await this.feesWrapper.feeForUpload(storagePeriods);
    if (!await this.feesWrapper.checkIfEnoughFunds(fee)) {
      throw new Error(`Insufficient funds: need at least ${fee} to upload the bundle`);
    }

    const uploaderRole = new Role(await this.rolesWrapper.selfOnboardedRole());
    if (!uploaderRole.is(Role.HERMES)) {
      throw new Error('Default address is not onboarded as the HERMES');
    }

    return this.uploadsWrapper.registerBundle(bundleId, fee, storagePeriods);
  }

  async isSheltering(bundleId) {
    return this.shelteringWrapper.isSheltering(bundleId);
  }

  async expirationDate(bundleId) {
    return this.shelteringWrapper.shelteringExpirationDate(bundleId);
  }

  async bundleSizeLimit() {
    return this.configWrapper.bundleSizeLimit();
  }

  async verifyBundle(bundle) {
    const bundleSizeLimit = await this.bundleSizeLimit();
    if (bundle.content.entries.length > bundleSizeLimit) {
      throw new ValidationError('Bundle size surpasses the limit');
    }
  }
}
