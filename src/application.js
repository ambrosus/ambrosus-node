/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import Builder from './builder';
import Server from './server';
import BundleDownloader from './workers/bundle_downloader';
import BundleFinaliser from './workers/bundle_finaliser';

class Application extends Builder {
  constructor(logger) {
    super();
    this.logger = logger;
  }

  async startServer() {
    this.server = new Server(this.dataModelEngine, this.config, this.logger);
    this.server.start();
  }

  async startBackground() {
    this.bundleDownloader = new BundleDownloader(this.dataModelEngine, this.config.bundleDownloadInterval(), this.logger);
    this.bundleDownloader.start();
    this.bundleFinaliser = new BundleFinaliser(this.dataModelEngine, this.config.bundleFinalisationInterval(),
      this.config.bundleSizeLimit(), this.logger);
    this.bundleFinaliser.start();
  }
}

export default Application;
