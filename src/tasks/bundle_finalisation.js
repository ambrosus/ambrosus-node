import build from '../build';
import config from 'config';

async function finalise(dataModelEngine) {
  const bundleStubId = Date.now().toString();
  const bundle = await dataModelEngine.finaliseBundle(bundleStubId);
  console.log(`Bundle ${bundle.bundleId} with ${bundle.content.entries.length} entries created`);
}

build()
  .then(({dataModelEngine}) => {
    setInterval(() => finalise(dataModelEngine).catch((err) => console.error(err)),
      config.get('bundle.finalisationInterval'));
  })
  .catch((err) => console.error(err));

