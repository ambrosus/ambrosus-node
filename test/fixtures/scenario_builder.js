import {createFullAsset, createFullEvent} from './assets_events';
import {addAccountRequest} from './account';
import {put} from '../../src/utils/dict_utils';

const defaultScenarioProcessor = (identityManager) => ({
  onAddAdminAccount: async (accountWithSecret) => accountWithSecret,
  onAddAsset: async (asset) => asset,
  onAddEvent: async (event) => event,
  onAddAccount: async () => identityManager.createKeyPair()
});

class ScenarioBuilder {
  constructor(identityManager, processor = defaultScenarioProcessor(identityManager)) {
    this.identityManager = identityManager;
    this.processor = processor;
    this.reset();
  }

  reset() {
    this.accounts = [];
    this.events = [];
    this.assets = [];
  }

  async addAdminAccount(accountWithSecret) {
    const processedAccount = await this.processor.onAddAdminAccount(accountWithSecret);
    const processedAccountWithSecret = put(processedAccount, 'secret', accountWithSecret.secret);
    this.accounts.push(processedAccountWithSecret);
    return processedAccountWithSecret;
  }

  async addAccount(accountInx = 0, addressWithSecret = null, fields = {}) {
    const newScenarioAccount = addressWithSecret === null ? this.identityManager.createKeyPair() : addressWithSecret;
    const accountRequest = addAccountRequest({address: newScenarioAccount.address, ...fields});
    const processedAccount = await this.processor.onAddAccount(accountRequest, this.accounts[accountInx].secret);
    const processedAccountWithSecret = put(processedAccount, 'secret', newScenarioAccount.secret);
    this.accounts.push(processedAccountWithSecret);
    return processedAccountWithSecret;
  }

  async addAsset(accountInx = 0 , fields = {}) {
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

  async addEvent(accountInx = 0, subjectInx = 0, fields = {}, data = {}) {
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
