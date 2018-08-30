/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/


import {ValidationError} from '../errors/errors';

export default class UploadRepository {
  constructor(uploadsWrapper, shelteringWrapper, feesWrapper, configWrapper) {
    this.uploadsWrapper = uploadsWrapper;
    this.feesWrapper = feesWrapper;
    this.shelteringWrapper = shelteringWrapper;
    this.configWrapper = configWrapper;
  }

  async uploadBundle(bundleId, storagePeriods) {
    const fee = await this.feesWrapper.feeForUpload(storagePeriods);
    return this.uploadsWrapper.registerBundle(bundleId, fee, storagePeriods);
  }

  async isSheltering(bundleId) {
    return this.shelteringWrapper.isSheltering(bundleId);
  }

  async expirationDate(bundleId) {
    return this.shelteringWrapper.shelteringExpirationDate(bundleId);
  }

  async verifyBundle(bundle) {
    const bundleSizeLimit = await this.configWrapper.bundleSizeLimit();
    if (bundle.content.entries.length > bundleSizeLimit) {
      throw new ValidationError('Bundle size surpasses the limit');
    }
  }
}
