/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {cleanDatabase, connectToMongo} from '../../src/utils/db_utils';
import FindEventQueryObjectFactory, {FindEventQueryObject} from '../../src/services/find_event_query_object';
import {createWeb3} from '../../src/utils/web3_tools';
import EntityRepository from '../../src/services/entity_repository';
import IdentityManager from '../../src/services/identity_manager';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {adminAccountWithSecret, accountWithSecret} from '../fixtures/account';
import config from '../../src/config/config';
import allPermissions from '../../src/utils/all_permissions';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;



describe('Find Event Query Object', () => {
  let db;
  let client;
  let findEventQueryObjectFactory;
  let findEventQueryObject;
  let storage;
  let identityManager;

  before(async () => {
    ({db, client} = await connectToMongo(config));
    storage = new EntityRepository(db);
    findEventQueryObjectFactory = new FindEventQueryObjectFactory(db);
    findEventQueryObject = findEventQueryObjectFactory.create();
    identityManager = new IdentityManager(await createWeb3());
  });

  after(async () => {
    await cleanDatabase(db);
    client.close();
  });

  it('is created by FindEventQueryObjectFactory', () => {
    expect(findEventQueryObject instanceof FindEventQueryObject).to.be.true;
  });

  it('has default sorting key', () => {
    expect(findEventQueryObject.getSortingKey()).to.be.deep.equal([['content.idData.timestamp', 'descending']]);
  });

  it('default assemble options', async () => {
    expect(findEventQueryObject.assembleOptionsForQuery()).to.deep.equal({
      skip: 0,
      limit: 100,
      sort: [['content.idData.timestamp', 'descending']],
      projection: {
        _id: 0,
        repository: 0
      }
    });
  });

  it('properly assembles mongodb query', () => {
    const params = {
      assetId: 12,
      createdBy: '0x123',
      fromTimestamp: 1,
      toTimestamp: 2,
      data: {score: 10, acceleration: {valueX: 17}, location: {asset: '0x123'}, geoJson: {locationLongitude: 10, locationLatitude: 20, locationMaxDistance: 30}}
    };

    findEventQueryObject = findEventQueryObjectFactory.create(params, 0);
    const result = findEventQueryObject.assembleQuery();
    expect(result).to.deep.eq({
      $and: [
        {'content.idData.accessLevel': {$lte: 0}},
        {'content.data': {$elemMatch: {score: 10}}},
        {'content.data': {$elemMatch: {acceleration: {valueX: 17}}}},
        {'content.data': {$elemMatch: {location: {asset: '0x123'}}}},
        {'content.data.geoJson': {$near: {
          $geometry: {
            type: 'Point',
            coordinates: [10, 20]
          },
          $maxDistance: 30
        }}},
        {'content.idData.assetId': 12},
        {'content.idData.createdBy': '0x123'},
        {'content.idData.timestamp': {$gte: 1}},
        {'content.idData.timestamp': {$lte: 2}}
      ]
    });
  });

  describe('query execution', () => {
    describe('without params', () => {
      let scenario;
      before(async () => {
        scenario = new ScenarioBuilder(identityManager);
        await scenario.addAdminAccount(adminAccountWithSecret);
        await scenario.addAsset(0);
        await scenario.addAsset(0);
        const eventsSet = await scenario.generateEvents(
          135,
          (inx) => ({
            accountInx: 0,
            subjectInx: (inx % 3 === 0 ? 1 : 0),
            fields: {timestamp: inx, accessLevel: inx % 10},
            data: {}
          })
        );
        for (const event of eventsSet) {
          await storage.storeEvent(event);
        }

        findEventQueryObject = findEventQueryObjectFactory.create({}, 5);
      });

      after(async () => {
        await cleanDatabase(db);
      });

      it('returns 100 newest events without page and perPage params', async () => {
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(100);
        expect(ret.results[0]).to.deep.equal(scenario.events[134]);
        expect(ret.results[99]).to.deep.equal(scenario.events[35]);
        expect(ret.resultCount).to.equal(135);
      });

      it('removes data field if access level is too low', async () => {
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(100);
        expect(ret.resultCount).to.equal(135);
        ret.results.forEach((event) => {
          if (event.content.idData.accessLevel <= 5) {
            expect(event.content).to.include.key('data');
          } else {
            expect(event.content).to.not.include.key('data');
          }
        });
      });
    });

    describe('with additional criteria', () => {
      let scenario;
      let eventsSet;

      const makeLocationAssetEntry = (assetIndex) => ({
        type: 'ambrosus.event.location.asset',
        asset: scenario.assets[assetIndex].assetId
      });

      const makeLocationGeoEntry = (lon, lat) => ({
        type: 'ambrosus.event.location.geo',
        geoJson: {
          type: 'Point',
          coordinates: [lon, lat]
        }
      });

      const makeIdentifiersEntry = (identifiers) => ({
        type: 'ambrosus.event.identifiers',
        ...identifiers
      });

      before(async () => {
        scenario = new ScenarioBuilder(identityManager);
        await scenario.addAdminAccount(adminAccountWithSecret);
        await scenario.addAccount(0, accountWithSecret, {permissions: [allPermissions.createEvent]});
        await scenario.addAsset(0, {timestamp: 0});
        await scenario.addAsset(0, {timestamp: 1});

        eventsSet = [
          await scenario.addEvent(0, 0, {timestamp: 0, accessLevel: 0},
            [makeLocationAssetEntry(0), makeIdentifiersEntry({id: '1'})]),
          await scenario.addEvent(0, 0, {timestamp: 1, accessLevel: 1},
            [makeLocationAssetEntry(1), makeIdentifiersEntry({id: '2'})]),
          await scenario.addEvent(0, 0, {timestamp: 2, accessLevel: 2},
            [makeLocationAssetEntry(0), makeIdentifiersEntry({id: '2', id2: 'abc'})]),
          await scenario.addEvent(1, 0, {timestamp: 3, accessLevel: 0},
            [makeLocationAssetEntry(1), {type: 'some.other.type', id: '3'}]),
          await scenario.addEvent(1, 0, {timestamp: 4, accessLevel: 1}, [makeLocationAssetEntry(0)]),
          await scenario.addEvent(0, 1, {timestamp: 5, accessLevel: 2}, [makeLocationAssetEntry(1)]),
          await scenario.addEvent(0, 1, {timestamp: 6, accessLevel: 0}, [makeLocationAssetEntry(0)]),
          await scenario.addEvent(0, 1, {timestamp: 7, accessLevel: 1}, [makeLocationGeoEntry(0, 0)]),
          await scenario.addEvent(1, 1, {timestamp: 8, accessLevel: 2}, [makeLocationGeoEntry(0, 1)]),
          await scenario.addEvent(1, 1, {timestamp: 9, accessLevel: 0}, [makeLocationGeoEntry(0, 0.00005)])
        ];

        for (const event of eventsSet) {
          await storage.storeEvent(event);
        }
      });

      after(async () => {
        await cleanDatabase(db);
      });

      it('with assetId param returns events for selected asset', async () => {
        const targetAssetId = scenario.assets[0].assetId;
        findEventQueryObject = findEventQueryObjectFactory.create({assetId: targetAssetId}, 10);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(5);
        expect(ret.resultCount).to.equal(5);
        expect(ret.results).to.deep.equal([eventsSet[0], eventsSet[1], eventsSet[2], eventsSet[3], eventsSet[4]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.assetId).to.equal(targetAssetId));
      });

      it('with createdBy param returns events for selected creator', async () => {
        const targetCreatorAddress = scenario.accounts[0].address;
        findEventQueryObject = findEventQueryObjectFactory.create({createdBy: targetCreatorAddress}, 10);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(6);
        expect(ret.resultCount).to.equal(6);
        expect(ret.results).to.deep.equal([eventsSet[0], eventsSet[1], eventsSet[2], eventsSet[5], eventsSet[6], eventsSet[7]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.createdBy).to.equal(targetCreatorAddress));
      });

      it('with fromTimestamp param returns only events newer than selected timestamp', async () => {
        findEventQueryObject = findEventQueryObjectFactory.create({fromTimestamp: 4}, 10);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(6);
        expect(ret.resultCount).to.equal(6);
        expect(ret.results).to.deep.equal([eventsSet[4], eventsSet[5], eventsSet[6], eventsSet[7], eventsSet[8], eventsSet[9]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.least(4));
      });

      it('with toTimestamp param returns only events older than selected timestamp', async () => {
        findEventQueryObject = findEventQueryObjectFactory.create({toTimestamp: 2}, 10);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(3);
        expect(ret.results).to.deep.equal([eventsSet[0], eventsSet[1], eventsSet[2]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.at.most(2));
      });

      it('with fromTimestamp param and toTimestamp param returns events from between selected timestamps', async () => {
        findEventQueryObject = findEventQueryObjectFactory.create({fromTimestamp: 2, toTimestamp: 4}, 10);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(3);
        expect(ret.results).to.deep.equal([eventsSet[2], eventsSet[3], eventsSet[4]].reverse());
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(2, 4));
      });

      it('with perPage returns requested number of events', async () => {
        findEventQueryObject = findEventQueryObjectFactory.create({perPage: 3}, 10);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(10);
        expect(ret.results).to.deep.equal([eventsSet[7], eventsSet[8], eventsSet[9]].reverse());
      });

      it('with page and perPage returns limited requested of events from requested page', async () => {
        findEventQueryObject = findEventQueryObjectFactory.create({page: 2, perPage: 3}, 10);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(10);
        expect(ret.results).to.deep.equal([eventsSet[1], eventsSet[2], eventsSet[3]].reverse());
      });

      it('with all params provided returns events for selected asset and creator, from between selected timestamps and with requested paging', async () => {
        const targetAssetId = scenario.assets[0].assetId;
        const targetCreatorAddress = scenario.accounts[1].address;
        findEventQueryObject = findEventQueryObjectFactory.create({fromTimestamp: 1, toTimestamp: 4, assetId: targetAssetId, perPage: 2, page: 0, createdBy: targetCreatorAddress}, 10);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(2);
        expect(ret.resultCount).to.equal(2);
        expect(ret.results[0]).to.deep.equal(eventsSet[4]);
        expect(ret.results[1]).to.deep.equal(eventsSet[3]);
        ret.results.forEach((element) => expect(element.content.idData.timestamp).to.be.within(1, 4));
      });

      it('can search by regular expressions', async () => {
        const targetAssetId = scenario.assets[0].assetId;
        const targetCreatorAddress = scenario.accounts[1].address;

        findEventQueryObject = findEventQueryObjectFactory.create({assetId: new RegExp(targetAssetId), createdBy: new RegExp(targetCreatorAddress)}, 10);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(2);
        expect(ret.resultCount).to.equal(2);
        expect(ret.results[0]).to.deep.equal(eventsSet[4]);
        expect(ret.results[1]).to.deep.equal(eventsSet[3]);
      });

      it('search by data entry', async () => {
        const targetAssetId = scenario.assets[0].assetId;
        findEventQueryObject = findEventQueryObjectFactory.create({data: {asset: targetAssetId}}, 1);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(3);
        expect(ret.resultCount).to.equal(3);
        expect(ret.results).to.deep.equal([eventsSet[6], eventsSet[4], eventsSet[0]]);
      });

      it('search by geo location', async () => {
        findEventQueryObject = findEventQueryObjectFactory.create({data: {geoJson: {locationLongitude : 0, locationLatitude: 0, locationMaxDistance: 1000}}}, 3);
        const ret = await findEventQueryObject.execute();
        expect(ret.results).have.lengthOf(2);
        expect(ret.resultCount).to.equal(2);
        expect(ret.results).to.deep.equal([eventsSet[9], eventsSet[7]]);
      });

      describe('search by asset identifiers', () => {
        const makeAssetIdentifierSearchParams = (identifiers) => ({
          data: {
            type: 'ambrosus.event.identifiers',
            ...identifiers
          }
        });

        it('returns events with matching identifiers', async () => {
          findEventQueryObject = findEventQueryObjectFactory.create(makeAssetIdentifierSearchParams({id: '2'}), 100);
          const found = await findEventQueryObject.execute();
          expect(found.results).to.deep.equal([eventsSet[2], eventsSet[1]]);
          expect(found.resultCount).to.equal(2);
        });

        it('finds by regex', async () => {
          findEventQueryObject = findEventQueryObjectFactory.create(makeAssetIdentifierSearchParams({id2: /^a.c$/}), 100);
          const found = await findEventQueryObject.execute();
          expect(found.results).to.deep.equal([eventsSet[2]]);
          expect(found.resultCount).to.equal(1);
        });

        it('finds events when select by several ids', async () => {
          findEventQueryObject = findEventQueryObjectFactory.create(
            makeAssetIdentifierSearchParams({id: '2', id2: 'abc'}), 100);
          const found = await findEventQueryObject.execute();
          expect(found.results).to.deep.equal([eventsSet[2]]);
          expect(found.resultCount).to.equal(1);
        });

        it(`omits events when the access level in event was higher than user's`, async () => {
          findEventQueryObject = findEventQueryObjectFactory.create(makeAssetIdentifierSearchParams({id: '2'}), 1);
          const found = await findEventQueryObject.execute();
          expect(found.results).to.deep.equal([eventsSet[1]]);
          expect(found.resultCount).to.equal(1);
        });

        it('ignores events with type other than ambrosus.event.identifiers', async () => {
          findEventQueryObject = findEventQueryObjectFactory.create(makeAssetIdentifierSearchParams({id: '3'}), 100);
          const found = await findEventQueryObject.execute();
          expect(found.results).to.deep.equal([]);
          expect(found.resultCount).to.equal(0);
        });

        it('returns empty array when unknown identifier', async () => {
          findEventQueryObject = findEventQueryObjectFactory.create(makeAssetIdentifierSearchParams({unknownId: '3'}), 100);
          const found = await findEventQueryObject.execute();
          expect(found.results).to.deep.equal([]);
          expect(found.resultCount).to.equal(0);
        });
      });
    });
  });
});
