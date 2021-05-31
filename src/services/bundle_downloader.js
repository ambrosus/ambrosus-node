/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class BundleDownloader {
  constructor(httpsClient) {
    this.httpsClient = httpsClient;
  }

  async openBundleDownloadStream(vendorUrl, bundleId) {
    const fullPath = `/bundle/${bundleId}`;
    const {response, statusCode} = await this.httpsClient.openHTTPSGetStream(vendorUrl, fullPath);
    await this.httpsClient.validateIncomingStatusCode(statusCode, vendorUrl);
    return response;
  }

  async downloadBundleFull(vendorUrl, bundleId) {
    const fullPath = `/bundle/${bundleId}`;
    const res = await this.httpsClient.performHTTPSGet(vendorUrl, fullPath);

    console.log(`downloadBundleFull(vendorUrl): ${vendorUrl}`);

    await this.httpsClient.validateIncomingStatusCode(res.statusCode, vendorUrl);

    return res.body;
  }

  async downloadBundleMetadata(vendorUrl, bundleId) {
    const fullPath = `/bundle/${bundleId}/info`;
    const res = await this.httpsClient.performHTTPSGet(vendorUrl, fullPath);
    await this.httpsClient.validateIncomingStatusCode(res.statusCode, vendorUrl);
    return res.body;
  }

  async remoteBundleRestoreCall(vendorUrl, bundleId) {
    const fullPath = `/bundle/${bundleId}/restore`;
    const res = await this.httpsClient.performHTTPSGet(vendorUrl, fullPath);
    await this.httpsClient.validateIncomingStatusCode(res.statusCode, vendorUrl + fullPath);
    return res.body;
  }
}
