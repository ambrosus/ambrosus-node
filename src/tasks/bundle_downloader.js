import build from '../build';
import Config from '../utils/config';

class BundleDownloadService {
  constructor(proofRepository) {
    this.proofRepository = proofRepository;
  }

  async start() {
    this.last = await this.proofRepository.getBundleCount();
    console.log(`Total amount of bundles: ${this.last}.`);
    return setInterval(() => {
      this.downloadAllNew().catch(console.error);
    }, Config.bundleDownloadInterval());
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
    console.log(`Downloading bundle no. ${index}...`);
    const bundleId = await this.proofRepository.getBundleByIndex(0);
    console.log(`Bundle is: ${bundleId}.`);
    // Download bundle code goes here
    console.log(`Bundle ${bundleId} downloaded.`);
  }
}

build()
  .then(async ({dataModelEngine}) => {
    await new BundleDownloadService(dataModelEngine.proofRepository).start();
  })
  .catch((exception) => {
    console.error(exception);
    process.exit(1);
  });
