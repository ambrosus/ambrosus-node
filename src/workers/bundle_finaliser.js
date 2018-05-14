import PeriodicWorker from './periodic_worker';
import {getTimestamp} from '../utils/time_utils';

export default class BundleFinaliser extends PeriodicWorker {
  constructor(dataModelEngine, interval, output = console) {
    super(interval);
    this.dataModelEngine = dataModelEngine;
    this.output = output;
  }

  async work() {
    return this.finalise();
  }

  async finalise() {
    const bundleStubId = getTimestamp().toString();
    const bundle = await this.dataModelEngine.finaliseBundle(bundleStubId);
    if (bundle) {
      this.output.log(`Bundle ${bundle.bundleId} with ${bundle.content.entries.length} entries created`);
    }
  }
}
