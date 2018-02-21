import {createFullAsset, createFullEvent} from './assets_events';

const defaultScenarioProcessor = {
  onAddAsset: async (asset) => asset,
  onAddEvent: async (event) => event
};

class ScenarioBuilder {
  constructor(identityManager, processor = defaultScenarioProcessor) {
    this.identityManager = identityManager;
    this.processor = processor;
    this.reset();
  }

  reset() {
    this.events = [];
    this.assets = [];
  }

  async addAsset(fields = {}) {
    const asset = createFullAsset(this.identityManager, fields);
    const processedAsset = await this.processor.onAddAsset(asset);
    this.assets.push(processedAsset);
    return processedAsset;
  }

  async addEvent(subject, fields = {}, data = {}) {
    const event = createFullEvent(this.identityManager, {...fields, assetId: this.assets[subject].assetId}, data);
    const processedEvent = await this.processor.onAddEvent(event);
    this.events.push(processedEvent);
    return processedEvent;
  }

  async addAssetsSerial(num, generator) {
    const ret = [];
    for (let it = 0; it < num; ++it) {
      const fields = generator(it);
      ret.push(await this.addAsset(fields));
    }
    return ret;
  }

  async addEventsSerial(num, generator) {
    const ret = [];
    for (let it = 0; it < num; ++it) {
      const {subject, fields, data} = generator(it);
      ret.push(await this.addEvent(subject, fields, data));
    }
    return ret;
  }
}

export default ScenarioBuilder;

