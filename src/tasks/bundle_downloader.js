import build from '../build';
import BundleDownloadService from '../services/bundle_downloader';

build()
  .then(async ({dataModelEngine}) => {
    await new BundleDownloadService(dataModelEngine).start();
  })
  .catch((exception) => {
    console.error(exception);
    process.exit(1);
  });
