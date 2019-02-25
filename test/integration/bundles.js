/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import chaiHttp from 'chai-http';

import {adminAccountWithSecret} from '../fixtures/account';
import ServerApparatus, {apparatusScenarioProcessor} from '../helpers/server_apparatus';
import ScenarioBuilder from '../fixtures/scenario_builder';
import {properTxHash} from '../helpers/web3chai';

chai.use(properTxHash);
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
    apparatus = new ServerApparatus();
    await apparatus.start();

    scenario = new ScenarioBuilder(apparatus.identityManager, apparatusScenarioProcessor(apparatus));
    await scenario.addAdminAccount(adminAccountWithSecret);
    await apparatus.onboardAsHermes(url);

    // this 2 assets and 3 events will go into the bundle
    entitiesIds = [
      await scenario.addAsset(0, {timestamp: 0}),
      await scenario.addAsset(0, {timestamp: 1}),
      await scenario.addEvent(0, 0, {timestamp: 1}, [{type: '1'}]),
      await scenario.addEvent(0, 0, {timestamp: 2}, [{type: '2'}]),
      await scenario.addEvent(0, 1, {timestamp: 2}, [{type: 'e'}])
    ].map(mapEntitiesToIds);

    const newBundle = await apparatus.dataModelEngine.prepareBundleCandidate(1);
    res = await apparatus.dataModelEngine.acceptBundleCandidate(newBundle, 1, 1);
    await apparatus.dataModelEngine.uploadAcceptedBundleCandidates();
    // this additional event should not go into the bundle
    await scenario.addEvent(0, 1, {timestamp: 3}, [{type: '4'}]);
  });

  after(async () => {
    await apparatus.cleanDB();
    await apparatus.stop();
  });

  describe('finalising bundles', () => {
    it('should only include assets and events uploaded up until finalisation', () => {
      const includedEntities = res.content.entries.map(mapEntitiesToIds);
      expect(includedEntities).to.deep.include.members(entitiesIds);
      expect(includedEntities.length).to.equal(entitiesIds.length);
    });

    it('should upload the proof to ethereum, and emit an event', async () => {
      const challengesEventEmitterContract = await apparatus.challengesEventEmitterWrapper.contract();
      const emittedEvents = await challengesEventEmitterContract.getPastEvents('ChallengeCreated');

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
    });

    it('assets and events should have fields in metadata set up', async () => {
      const assetResponse = await apparatus.request()
        .get(`/assets/${entitiesIds[0]}`);
      const eventResponse = await apparatus.request()
        .get(`/events/${entitiesIds[3]}`);
      expect(assetResponse.body.metadata.bundleId).to.equal(res.bundleId);
      expect(assetResponse.body.metadata.bundleTransactionHash).to.be.properTxHash;
      expect(assetResponse.body.metadata.bundleUploadTimestamp).not.to.be.undefined;
      expect(eventResponse.body.metadata.bundleId).to.equal(res.bundleId);
      expect(eventResponse.body.metadata.bundleTransactionHash).to.be.properTxHash;
      expect(eventResponse.body.metadata.bundleUploadTimestamp).not.to.be.undefined;
    });

    it('return 404 if bundle with requested id does not exist', async () => {
      const request = apparatus.request()
        .get(`/bundle/nonexistingBundle`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });

  describe('getting bundle metadata', () => {
    it('works for existing bundle', async () => {
      const response = await apparatus.request()
        .get(`/bundle/${res.bundleId}/info`);

      expect(response.body).to.have.keys(['bundleId', 'bundleProofBlock', 'bundleTransactionHash', 'bundleUploadTimestamp', 'storagePeriods']);
      expect(response.body.bundleTransactionHash).to.be.properTxHash;
    });

    it('return 404 if bundle with requested id does not exist', async () => {
      const request = apparatus.request()
        .get(`/bundle/nonexistingBundle/info`);
      await expect(request).to.eventually.be.rejected
        .and.have.property('status', 404);
    });
  });
});
