import {createFullAsset, createFullEvent} from './assets_events';

class ScenarioBuilder {
  constructor(identityManager) {
    this.identityManager = identityManager;
    this.reset();
  }

  reset() {
    this.events = [];
    this.assets = [];
  }

  addAsset(fields = {}) {
    this.assets.push(createFullAsset(this.identityManager, fields));
    return this;
  }

  addEvent(subject, fields = {}, data = {}) {
    this.events.push(createFullEvent(this.identityManager, {...fields, assetId: this.assets[subject].assetId}, data));
    return this;
  }

  addAssetsSerial(num, generator) {
    for (let it = 0; it < num; ++it) {
      const fields = generator(it);
      this.addAsset(fields);
    }
    return this;
  }

  addEventsSerial(num, generator) {
    for (let it = 0; it < num; ++it) {
      const {subject, fields, data} = generator(it);
      this.addEvent(subject, fields, data);
    }
    return this;
  }
}

export default ScenarioBuilder;
