import config from 'config';

export default async function startBundleFinalisationWorker(dataModelEngine, finalisationCallback) {
  return setInterval(() => finalisationCallback(dataModelEngine).catch(console.error),
    config.get('bundle.finalisationInterval'));
}
