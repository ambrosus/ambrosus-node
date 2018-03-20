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
