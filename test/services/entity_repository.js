import chai from 'chai';
import {connectToMongo, cleanDatabase} from '../../src/utils/db_utils';
import {put} from '../../src/utils/dict_utils';

import {createAsset, createEvent} from '../fixtures/assets_events';
import {createWeb3} from '../../src/utils/web3_tools';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {adminAccountWithSecret} from '../fixtures/account';

import EntityRepository from '../../src/services/entity_repository';

const {expect} = chai;

describe('Entity Repository', () => {
  let db;
  let client;
  let storage;
  let scenario;

  before(async () => {
    ({db, client} = await connectToMongo());
    storage = new EntityRepository(db);
    scenario = new ScenarioBuilder(new IdentityManager(await createWeb3()));
  });

  describe('Assets', () => {
    before(async () => {
      await cleanDatabase(db);
      scenario.reset();
      await scenario.injectAccount(adminAccountWithSecret);
    });

    it('db round trip works', async () => {
      const exampleAssetId = '0x123456';
      const exampleAsset = put(createAsset(), 'assetId', exampleAssetId);
      await storage.storeAsset(exampleAsset);
      await expect(storage.getAsset(exampleAssetId)).to.eventually.be.deep.equal(exampleAsset);
    });

    it('returns null for non-existing asset', async () => {
      const otherAssetId = '0x33333';
      await expect(storage.getAsset(otherAssetId)).to.eventually.be.equal(null);
    });
  });


  describe('Events', () => {
    before(async () => {
      await cleanDatabase(db);
      scenario.reset();
      await scenario.injectAccount(adminAccountWithSecret);
    });
    it('db round trip works', async () => {
      const exampleEventId = '0x123456';
      const exampleEvent = put(createEvent(), 'eventId', exampleEventId);
      await storage.storeEvent(exampleEvent);
      await expect(storage.getEvent(exampleEventId)).to.eventually.be.deep.equal(exampleEvent);
    });

    it('returns null for non-existing event', async () => {
      const otherEventId = '0x33333';
      await expect(storage.getEvent(otherEventId)).to.eventually.be.equal(null);
    });

    describe('Find', () => {
      before(async () => {
        await cleanDatabase(db);
        scenario.reset();
        await scenario.injectAccount(adminAccountWithSecret);
        await scenario.addAsset(0);
        await scenario.addAsset(0);
        const eventsSet = await scenario.generateEvents(
          135,
          (inx) => ({
            accountInx: 0,
            subjectInx: (inx % 3 === 0 ? 1 : 0),
            fields: {timestamp: inx},
            data: {}
          })
        );
        for (const event of eventsSet) {
          await storage.storeEvent(event);
        }
      });

      it('without params returns 100 newest events', async () => {
        const ret = await expect(storage.findEvents({})).to.be.fulfilled;
        expect(ret.results).have.lengthOf(100);
        expect(ret.results[0]).to.deep.equal(scenario.events[134]);
        expect(ret.results[99]).to.deep.equal(scenario.events[35]);
        expect(ret.resultCount).to.equal(135);
      });

      describe('additional criteria', () => {
        let eventsSet;
        before(async () => {
          await cleanDatabase(db);
          scenario.reset();
          await scenario.injectAccount(adminAccountWithSecret);
          await scenario.addAsset(0);
          await scenario.addAsset(0);

          eventsSet = [
            await scenario.addEvent(0, 0, {timestamp: 0}),
            await scenario.addEvent(0, 0, {timestamp: 1}),
            await scenario.addEvent(0, 0, {timestamp: 2}),
            await scenario.addEvent(0, 1, {timestamp: 3}),
            await scenario.addEvent(0, 1, {timestamp: 4}),
            await scenario.addEvent(0, 1, {timestamp: 5})
          ];
          
          for (const event of eventsSet) {
            await storage.storeEvent(event);
          }
        });

        it('with assetId param returns events for selected asset', async () => {
          const targetAssetId = scenario.assets[0].assetId;
          const ret = await expect(storage.findEvents({assetId: targetAssetId})).to.be.fulfilled;
          expect(ret.results).have.lengthOf(3);
          expect(ret.resultCount).to.equal(3);
          expect(ret.results[0]).to.deep.equal(eventsSet[2]);
          expect(ret.results[1]).to.deep.equal(eventsSet[1]);
          expect(ret.results[2]).to.deep.equal(eventsSet[0]);
          ret.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));  
        });

        it('with fromTimestamp param returns only events newer thanselected timestamp', async () => {
          const ret = await expect(storage.findEvents({fromTimestamp: 4})).to.be.fulfilled;
          expect(ret.results).have.lengthOf(2);
          expect(ret.resultCount).to.equal(2);
          expect(ret.results[1]).to.deep.equal(eventsSet[4]);
          expect(ret.results[0]).to.deep.equal(eventsSet[5]);
          ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.least(4));
        });

        it('with toTimestamp param returns only events older than selected timestamp', async () => {
          const ret = await expect(storage.findEvents({toTimestamp: 2})).to.be.fulfilled;
          expect(ret.results).have.lengthOf(3);
          expect(ret.resultCount).to.equal(3);
          expect(ret.results[0]).to.deep.equal(eventsSet[2]);
          expect(ret.results[1]).to.deep.equal(eventsSet[1]);
          expect(ret.results[2]).to.deep.equal(eventsSet[0]);
          ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.most(2));
        });
      
        it('with fromTimestamp param and toTimestamp param returns events from between selected timestamps', async () => {
          const ret = await expect(storage.findEvents({fromTimestamp : 2, toTimestamp: 4})).to.be.fulfilled;
          expect(ret.results).have.lengthOf(3);
          expect(ret.resultCount).to.equal(3);
          expect(ret.results[0]).to.deep.equal(eventsSet[4]);
          expect(ret.results[1]).to.deep.equal(eventsSet[3]);
          expect(ret.results[2]).to.deep.equal(eventsSet[2]);
          ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 4));
        });

        it('with all params provided returns events for selected asset, from between selected timestamps', async () => {
          const targetAssetId = scenario.assets[0].assetId;
          const ret = await expect(storage.findEvents({fromTimestamp : 1, toTimestamp: 4, assetId: targetAssetId})).to.be.fulfilled;
          expect(ret.results).have.lengthOf(2);
          expect(ret.resultCount).to.equal(2);
          expect(ret.results[0]).to.deep.equal(eventsSet[2]);
          expect(ret.results[1]).to.deep.equal(eventsSet[1]);
          ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(1, 4));
        });
      });
    });
  });

  after(async () => {
    await cleanDatabase(db);
    scenario.reset();
    client.close();
  });
});
