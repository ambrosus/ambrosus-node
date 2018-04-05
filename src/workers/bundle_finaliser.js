import Config from '../utils/config';
import PeriodicWorker from './periodic_worker';
import {getTimestamp} from '../utils/time_utils';

export default class BundleFinaliser extends PeriodicWorker {
  constructor(dataModelEngine) {
    super(Config.bundleFinalisationInterval());
    this.dataModelEngine = dataModelEngine;
  }

  async work() {
    return this.finalise();
  }

  async finalise() {
    const bundleStubId = getTimestamp().toString();
    const bundle = await this.dataModelEngine.finaliseBundle(bundleStubId);
    console.log(`Bundle ${bundle.bundleId} with ${bundle.content.entries.length} entries created`);
  }
}
