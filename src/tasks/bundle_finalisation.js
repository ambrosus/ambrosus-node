import startBundleFinalisationWorker from './bundle_finalisation_worker';
import build from '../build';

async function finalise(dataModelEngine) {
  const bundleStubId = Date.now().toString();
  const bundle = await dataModelEngine.finaliseBundle(bundleStubId);
  console.log(`Bundle ${bundle.bundleId} with ${bundle.content.entries.length} entries created`);
}

build()
  .then(({dataModelEngine}) => startBundleFinalisationWorker(dataModelEngine, finalise))
  .catch(console.error);


