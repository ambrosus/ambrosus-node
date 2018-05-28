/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import url from 'url';
import {createWeb3, getDefaultAddress} from '../../src/utils/web3_tools';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import ScenarioBuilder from '../fixtures/scenario_builder';
import nullConsole from '../helpers/null_console';
import BundleDownloader from '../../src/workers/bundle_downloader';
import ContractManager from '../../src/services/contract_manager';
import Builder from '../../src/builder';
import Config from '../../src/utils/config';
import {createFullAsset} from '../fixtures/assets_events';
import {adminAccountWithSecret} from '../fixtures/account';

chai.use(sinonChai);
const {expect} = chai;

describe('Bundle downloader - integration', () => {
  let web3;
  let client;
  let bundleId;
  let apparatus;
  let dataModelEngine;
  let bundleDownloader;
  let asset;

  before(async () => {
    web3 = await createWeb3();
  });

  beforeEach(async () => {
    const bundleRegistryContractAddress = await ContractManager.deploy(web3);

    // Create two configuration objects aimed at two different Mongo DBs
    // The purpose is to simulate one db where the bundles originate and are
    // downloaded from, and another db where bundles are inserted to.
    const config1 = Config.default({bundleRegistryContractAddress});
    const mongoUrl = url.parse(config1.mongoUri());
    const config2 = Config.default({
      bundleRegistryContractAddress,
      mongoUri: `${mongoUrl.protocol}//${mongoUrl.host}/second_db`
    });

    apparatus = new Apparatus();
    await apparatus.start(web3, config1);

    const builder = new Builder();
    ({dataModelEngine, client} = await builder.build({web3}, config2));

    await dataModelEngine.proofRepository.addVendor(getDefaultAddress(web3), apparatus.url());

    bundleDownloader = new BundleDownloader(dataModelEngine, 5000, nullConsole);
    await bundleDownloader.beforeStart();


    const scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
    await scenario.addAdminAccount(adminAccountWithSecret);

    asset = createFullAsset(apparatus.identityManager, {createdBy: adminAccountWithSecret.address, timestamp: 1}, adminAccountWithSecret.secret);
    await apparatus.request()
      .post('/assets')
      .send(asset);
    ({bundleId} = await apparatus.dataModelEngine.finaliseBundle(1));
  });

  afterEach(async () => {
    client.close();
    await apparatus.stop();
  });

  it('has no bundles initially', async () => {
    const bundle = await dataModelEngine.entityRepository.getBundle(bundleId);
    expect(bundle).to.be.null;
  });

  it('download one bundle', async () => {
    await bundleDownloader.downloadOne(0);
    const bundle = await dataModelEngine.entityRepository.getBundle(bundleId);
    expect(bundle.bundleId).to.eq(bundleId);
  });

  it('download all new bundles', async () => {
    asset = createFullAsset(apparatus.identityManager, {createdBy: adminAccountWithSecret.address, timestamp: 2}, adminAccountWithSecret.secret);
    await apparatus.request()
      .post('/assets')
      .send(asset);
    const bundle2 = await apparatus.dataModelEngine.finaliseBundle(2);
    asset = createFullAsset(apparatus.identityManager, {createdBy: adminAccountWithSecret.address, timestamp: 3}, adminAccountWithSecret.secret);
    await apparatus.request()
      .post('/assets')
      .send(asset);
    const bundle3 = await apparatus.dataModelEngine.finaliseBundle(3);
  
    await bundleDownloader.downloadAllNew();  
    let bundle = await dataModelEngine.entityRepository.getBundle(bundleId);
    expect(bundle.bundleId).to.eq(bundleId);
    bundle = await dataModelEngine.entityRepository.getBundle(bundle2.bundleId);
    expect(bundle.bundleId).to.eq(bundle2.bundleId);
    bundle = await dataModelEngine.entityRepository.getBundle(bundle3.bundleId);
    expect(bundle.bundleId).to.eq(bundle3.bundleId);
  });
});
