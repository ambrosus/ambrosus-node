/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

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

  async downloadBundleMetadata(vendorUrl, bundleId) {
    const fullPath = `/bundle/${bundleId}/info`;
    const res = await this.httpsClient.performHTTPSGet(vendorUrl, fullPath);
    await this.httpsClient.validateIncomingStatusCode(res.statusCode, vendorUrl);
    return res.body;
  }
}
