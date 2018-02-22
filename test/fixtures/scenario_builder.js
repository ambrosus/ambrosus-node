import {createFullAsset, createFullEvent} from './assets_events';

const defaultScenarioProcessor = {
  onInjectAccount: async (account) => account,
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
    this.accounts = [];
    this.events = [];
    this.assets = [];
  }

  async injectAccount(account) {
    const processedAccount = await this.processor.onInjectAccount(account);
    this.accounts.push(processedAccount);
    return processedAccount;
  }

  async addAsset(accountInx, fields = {}) {
    const account = this.accounts[accountInx];
    const asset = createFullAsset(
      this.identityManager, 
      {
        createdBy: account.address, 
        ...fields
      }, 
      account.secret);
    const processedAsset = await this.processor.onAddAsset(asset);
    this.assets.push(processedAsset);
    return processedAsset;
  }

  async addEvent(accountInx, subjectInx, fields = {}, data = {}) {
    const account = this.accounts[accountInx];
    const event = createFullEvent(
      this.identityManager, 
      {
        createdBy: account.address, 
        assetId: this.assets[subjectInx].assetId,
        ...fields
      }, 
      data, 
      account.secret);
    const processedEvent = await this.processor.onAddEvent(event);
    this.events.push(processedEvent);
    return processedEvent;
  }

  async generateAssets(num, generator) {
    const ret = [];
    for (let it = 0; it < num; ++it) {
      const {accountInx, fields} = generator(it);
      ret.push(await this.addAsset(accountInx, fields));
    }
    return ret;
  }

  async generateEvents(num, generator) {
    const ret = [];
    for (let it = 0; it < num; ++it) {
      const {accountInx, subjectInx, fields, data} = generator(it);
      ret.push(await this.addEvent(accountInx, subjectInx, fields, data));
    }
    return ret;
  }
}

export default ScenarioBuilder;

