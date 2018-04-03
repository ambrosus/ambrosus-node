import Config from '../utils/config';
import PeriodicWorker from './periodic_worker';

export default class BundleDownloader extends PeriodicWorker {
  constructor(dataModelEngine) {
    super(Config.bundleDownloadInterval());
    this.dataModelEngine = dataModelEngine;
    this.proofRepository = dataModelEngine.proofRepository;
  }

  async init() {
    this.last = await this.proofRepository.getBundleCount();
  }

  async work() {
    return this.downloadAllNew();
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
