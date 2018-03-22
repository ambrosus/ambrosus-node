import Config from '../utils/config';

export default class BundleDownloader {
  constructor(dataModelEngine) {    
    this.dataModelEngine = dataModelEngine;
    this.proofRepository = dataModelEngine.proofRepository;
  }

  async start(interval = Config.bundleDownloadInterval()) {
    this.init();
    return setInterval(() => {
      this.downloadAllNew().catch(console.error);
    }, interval);
  }

  async init() {
    this.last = await this.proofRepository.getBundleCount();
  }

  async downloadAllNew() {    
    const count = await this.proofRepository.getBundleCount();
    console.log(`Found ${count - this.last} new bundles.`);
    for (let index = this.last; index < count; index++) {
      await this.downloadOne(index);
    }    
    this.last = count;
  }

  async downloadOne(index) {    
    const bundleId = await this.proofRepository.getBundleByIndex(index);
    const vendorId = (await this.proofRepository.getNodeForBundle(bundleId)).toLowerCase();
    const vendorUrl = await this.proofRepository.getVendorUrl(vendorId);
    console.log(`Downloading bundle ${bundleId} (index: ${index}) for vendor: ${vendorId} from ${vendorUrl}...`);    
    await this.dataModelEngine.downloadBundle(bundleId, vendorId);
    console.log(`Bundle downloaded.`);
  }
}
