export default class EntityDownloader {
  constructor(httpsClient) {
    this.httpsClient = httpsClient;
  }

  async downloadBundle(vendorUrl, bundleId) {
    const fullPath = `/bundle/${bundleId}`;
    const options = {
      hostname : vendorUrl,
      path : fullPath
    };
    const res = await this.httpsClient.performHTTPSGet(options);
    await this.httpsClient.validateIncomingStatusCode(res.statusCode);
    return res.body;
  }
}
