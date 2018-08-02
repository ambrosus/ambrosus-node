/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {getDefaultAddress} from '../utils/web3_tools';


export default class UploadRepository {
  constructor(contractManager) {
    this.contractManager = contractManager;
  }

  async uploadBundle(bundleId, storagePeriods) {
    const feesContract = await this.contractManager.feesContract();
    const uploadsContract = await this.contractManager.uploadsContract();

    const fee = await feesContract.methods.getFeeForUpload(storagePeriods).call();

    const uploadTx = await uploadsContract.methods
      .registerBundle(bundleId, storagePeriods)
      .send({from: getDefaultAddress(this.contractManager.web3), value: fee});

    return uploadTx;
  }
}
