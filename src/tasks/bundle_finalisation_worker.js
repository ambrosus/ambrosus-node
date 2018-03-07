import Config from '../utils/config';

export default async function startBundleFinalisationWorker(dataModelEngine, finalisationCallback) {
  return setInterval(() => finalisationCallback(dataModelEngine).catch(console.error),
    Config.get('bundle.finalisationInterval'));
}
