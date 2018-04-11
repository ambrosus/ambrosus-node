import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import chaiHttp from 'chai-http';

import {adminAccountWithSecret} from '../fixtures/account';
import Apparatus, {apparatusScenarioProcessor} from '../helpers/apparatus';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {getDefaultAddress, createWeb3} from '../../src/utils/web3_tools';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Bundles - Integrations', () => {
  const url = 'node.ambrosus.com';  
  let apparatus;
  let scenario;
  let res;
  let entitiesIds;

  const mapEntitiesToIds = (value) => {
    if (value.assetId) {
      return value.assetId;
    } else if (value.eventId) {
      return value.eventId;
    }

    throw new Error('Unexpected entity type');
  };

  before(async () => {
    apparatus = new Apparatus();
    await apparatus.start();

    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
    await scenario.addAdminAccount(adminAccountWithSecret);

    const from = getDefaultAddress(await createWeb3());
    await apparatus.contractManager.bundleRegistry.methods.addToWhitelist(from, url).send({from});

    // this 2 assets and 3 events will go into the bundle
    entitiesIds = [
      await scenario.addAsset(0, {timestamp: 0}),
      await scenario.addAsset(0, {timestamp: 1}),
      await scenario.addEvent(0, 0, {timestamp: 1}, {entries: [{type: '1'}]}),
      await scenario.addEvent(0, 0, {timestamp: 2}, {entries: [{type: '2'}]}),
      await scenario.addEvent(0, 1, {timestamp: 2}, {entries: [{type: 'e'}]})
    ].map(mapEntitiesToIds);

    res = await apparatus.modelEngine.finaliseBundle(1);

    // this additional event should not go into the bundle 
    await scenario.addEvent(0, 1, {timestamp: 3}, {entries: [{type: '4'}]});
  });

  after(async () => {
    await apparatus.cleanDB();
    apparatus.stop();
  });

  describe('finalising bundles', () => {
    it('should only include assets and events uploaded up until finalisation', () => {
      const includedEntities = res.content.entries.map(mapEntitiesToIds);
      expect(includedEntities).to.deep.include.members(entitiesIds);
      expect(includedEntities.length).to.equal(entitiesIds.length);
    });

    it('should upload the proof to ethereum, and emit a event', async () => {
      const emittedEvents = await apparatus
        .contractManager
        .bundleProofRegistryContract()
        .getPastEvents('BundleAdded');
      const expectedEvent = emittedEvents.filter((value) => value.returnValues.bundleId === res.bundleId);
      expect(expectedEvent).to.have.length(1);
    });
  });

  describe('getting bundles', () => {
    it('works for existing bundle', async () => {
      const response = await apparatus.request()
        .get(`/bundle/${res.bundleId}`);
      expect(response.body.content).to.deep.equal(res.content);
      expect(response.body.bundleId).to.equal(res.bundleId);
      expect(response.body.metadata).to.have.key('proofBlock');
    });

    it('return 404 if bundle with requested id does not exist', async () => {
      const request = apparatus.request()
        .get(`/bundle/nonexistingBundle`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });
});
