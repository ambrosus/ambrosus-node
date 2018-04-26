import Builder from './builder';
import Server from './server';
import BundleDownloader from './workers/bundle_downloader';
import BundleFinaliser from './workers/bundle_finaliser';

class Application extends Builder {
  constructor(output = console) {  
    super();  
    this.output = output;
  }

  async startServer() {
    this.server = new Server(this.dataModelEngine, this.config);
    this.server.start();
  }

  async startBackground() {
    this.bundleDownloader = new BundleDownloader(this.dataModelEngine, this.config.bundleDownloadInterval(), this.output);
    this.bundleDownloader.start();
    this.bundleFinaliser = new BundleFinaliser(this.dataModelEngine, this.config.bundleFinalisationInterval(), this.output);
    this.bundleFinaliser.start();
  }  
}

export default Application;
