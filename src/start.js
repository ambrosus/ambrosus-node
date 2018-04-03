import Server from './server';
import build from './build';
import BundleDownloader from './workers/bundle_downloader';
import BundleFinaliser from './workers/bundle_finaliser';

async function start() {
  const {dataModelEngine} = await build();
  
  const server = new Server(dataModelEngine);
  server.start();
  
  const bundleDownloader = new BundleDownloader(dataModelEngine);
  bundleDownloader.start();

  const bundleFinaliser = new BundleFinaliser(dataModelEngine);
  bundleFinaliser.start();
}

start()
  .catch((err) => {
    console.error(`${err}`);
    process.exit(1);
  });
