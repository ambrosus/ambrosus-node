import Config from '../utils/config';
import build from '../build';

const startBundleFinalisationWorker = async (dataModelEngine, finalisationCallback) =>
  setInterval(
    () => finalisationCallback(dataModelEngine).catch(console.error),
    Config.bundleFinalisationInterval());

const finalise = async (dataModelEngine) => {
  const bundleStubId = Date.now().toString();
  const bundle = await dataModelEngine.finaliseBundle(bundleStubId);
  console.log(`Bundle ${bundle.bundleId} with ${bundle.content.entries.length} entries created`);
};

if (require.main === module) {
  build()
    .then(({dataModelEngine}) => startBundleFinalisationWorker(dataModelEngine, finalise))
    .catch(console.error);
}

export default startBundleFinalisationWorker;
