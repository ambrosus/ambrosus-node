import Server from './server';
import BundleDownloader from './workers/bundle_downloader';
import BundleFinaliser from './workers/bundle_finaliser';
import Builder from './builder';

async function start() {
  const builder = new Builder();
  const {dataModelEngine} = await builder.build();
  
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
