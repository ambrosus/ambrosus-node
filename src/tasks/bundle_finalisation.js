import Config from '../utils/config';
import build from '../build';

export default async function startBundleFinalisationWorker(dataModelEngine, finalisationCallback) {
  return setInterval(() => finalisationCallback(dataModelEngine).catch(console.error),
    Config.bundleFinalisationInterval());
}

async function finalise(dataModelEngine) {
  const bundleStubId = Date.now().toString();
  const bundle = await dataModelEngine.finaliseBundle(bundleStubId);
  console.log(`Bundle ${bundle.bundleId} with ${bundle.content.entries.length} entries created`);
}

if (require.main === module) {
  build()
    .then(({dataModelEngine}) => startBundleFinalisationWorker(dataModelEngine, finalise))
    .catch(console.error);
}

