/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

export default class EntityDownloader {
  constructor(httpsClient) {
    this.httpsClient = httpsClient;
  }

  async downloadBundle(vendorUrl, bundleId) {
    const fullPath = `/bundle/${bundleId}`;
    const res = await this.httpsClient.performHTTPSGet(vendorUrl, fullPath);
    await this.httpsClient.validateIncomingStatusCode(res.statusCode);
    return res.body;
  }
}
