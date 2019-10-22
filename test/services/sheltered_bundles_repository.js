/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import ShelteredBundlesRepository from '../../src/services/sheltered_bundles_repository';
import sinon from 'sinon';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Sheltered bundles repository', () => {
  const atlasId = 'atlas';
  const otherSheltererId = 'other';

  let bundleStoreWrapperMock;
  let shelteredBundlesCacheMock;
  let blockchainStateWrapperMock;
  let shelteredBundlesRepository;

  describe('prepareResolutionEvent', () => {
    const events = [
      {
        returnValues: {
          bundleId: 1,
          shelterer: atlasId
        },
        blockNumber: 1,
        logIndex: 0
      },
      {
        returnValues: {
          bundleId: 2,
          shelterer: otherSheltererId
        },
        blockNumber: 2,
        logIndex: 0
      },
      {
        returnValues: {
          bundleId: 3,
          shelterer: atlasId
        },
        blockNumber: 2,
        logIndex: 1
      }];

    beforeEach(() => {
      shelteredBundlesRepository = new ShelteredBundlesRepository();
    });

    it('extracts the blockNumber, logIndex, the fields specified in selector and appends event type', async () => {
      expect(shelteredBundlesRepository.prepareEvents(events, ['bundleId', 'shelterer'])).to.deep.equal([
        {bundleId: 1, shelterer: atlasId, blockNumber: 1, logIndex: 0},
        {bundleId: 2, shelterer: otherSheltererId, blockNumber: 2, logIndex: 0},
        {bundleId: 3, shelterer: atlasId, blockNumber: 2, logIndex: 1}
      ]);
    });
  });

  describe('get ongoing bundles', () => {
    const fromBlock = 0;
    const latestBlock = 7;
    const addSheltererEvents = [
      {
        returnValues: {
          bundleId: 1,
          shelterer: atlasId
        },
        blockNumber: 1,
        logIndex: 0
      },
      {
        returnValues: {
          bundleId: 2,
          shelterer: otherSheltererId
        },
        blockNumber: 2,
        logIndex: 0
      },
      {
        returnValues: {
          bundleId: 3,
          shelterer: atlasId
        },
        blockNumber: 2,
        logIndex: 1
      }];
    const removeSheltererEvents = [
      {
        blockNumber: 5,
        logIndex: 0,
        returnValues: {
          bundleId: 1,
          shelterer: atlasId
        }
      },
      {
        returnValues: {
          bundleId: 2,
          shelterer: otherSheltererId
        },
        blockNumber: 6,
        logIndex: 0
      }];

    beforeEach(() => {
      shelteredBundlesCacheMock = {
        applyIncomingResolutionEvents: sinon.stub(),
        activeResolutions: ['activeResolutions']
      };
      blockchainStateWrapperMock = {
        getCurrentBlockNumber: sinon.stub()
      };
      bundleStoreWrapperMock = {
        sheltererAdded: sinon.stub().resolves(addSheltererEvents),
        sheltererRemoved: sinon.stub().resolves(removeSheltererEvents)
      };
      blockchainStateWrapperMock.getCurrentBlockNumber.onFirstCall()
        .resolves(latestBlock)
        .onSecondCall()
        .resolves(latestBlock + 3);
      shelteredBundlesRepository = new ShelteredBundlesRepository(atlasId, bundleStoreWrapperMock, blockchainStateWrapperMock, shelteredBundlesCacheMock);
      shelteredBundlesRepository.logger = {
        info: sinon.stub()
      };
      sinon.spy(shelteredBundlesRepository, 'prepareEvents');
    });

    it('on first call: gets transfers from earliest possible block and caches them', async () => {
      const result = await shelteredBundlesRepository.ongoingResolutions();
      expect(bundleStoreWrapperMock.sheltererAdded).to.be.calledWith(fromBlock, latestBlock);
      expect(bundleStoreWrapperMock.sheltererRemoved).to.be.calledWith(fromBlock, latestBlock);
      expect(result).to.deep.equal(shelteredBundlesCacheMock.activeResolutions);
    });

    it('on second call: gets transfers since previously resolved block', async () => {
      await shelteredBundlesRepository.ongoingResolutions();
      await shelteredBundlesRepository.ongoingResolutions();
      expect(bundleStoreWrapperMock.sheltererAdded).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(bundleStoreWrapperMock.sheltererRemoved).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(shelteredBundlesRepository.lastSavedBlock).to.equal(latestBlock + 3);
    });

    it('does not fetch new transfers when currentBlock equals lastSavedBlock', async () => {
      blockchainStateWrapperMock.getCurrentBlockNumber.onSecondCall().resolves(latestBlock);
      await shelteredBundlesRepository.ongoingResolutions();
      await shelteredBundlesRepository.ongoingResolutions();
      expect(bundleStoreWrapperMock.sheltererAdded).to.be.calledOnce;
      expect(bundleStoreWrapperMock.sheltererRemoved).to.be.calledOnce;
    });

    it('adds new transfers to cache, removes resolved and cancelled', async () => {
      await shelteredBundlesRepository.ongoingResolutions();
      expect(shelteredBundlesCacheMock.applyIncomingResolutionEvents).to.be.calledOnceWithExactly(
        shelteredBundlesRepository.prepareEvents(addSheltererEvents, ['bundleId', 'shelterer']).filter((event) => event.shelterer === atlasId),
        [],
        shelteredBundlesRepository.prepareEvents(removeSheltererEvents, ['bundleId', 'shelterer']).filter((event) => event.shelterer === atlasId)
      );
    });

    it('calls own methods with correct params', async () => {
      await shelteredBundlesRepository.ongoingResolutions();
      expect(shelteredBundlesRepository.prepareEvents).to.be.calledTwice;
      expect(shelteredBundlesRepository.prepareEvents).to.be.calledWith(addSheltererEvents.filter((event) => event.returnValues.shelterer === atlasId));
      expect(shelteredBundlesRepository.prepareEvents).to.be.calledWith(removeSheltererEvents.filter((event) => event.returnValues.shelterer === atlasId));
    });

    it('fetches events with steps - collects all events', async () => {
      const fetchEvents = sinon.stub();
      fetchEvents.withArgs(0, 0)
        .resolves([{blockNumber: 0, logIndex: 0}]);
      fetchEvents.withArgs(1, 1)
        .resolves([{blockNumber: 1, logIndex: 1}]);
      fetchEvents.withArgs(2, 2)
        .resolves([{blockNumber: 2, logIndex: 2}]);
      const result = await shelteredBundlesRepository.collectEventsWithStep(0, 2, 1, fetchEvents, []);
      expect(result).to.deep.eq([{blockNumber: 0, logIndex: 0}, {blockNumber: 1, logIndex: 1}, {blockNumber: 2, logIndex: 2}]);
    });

    it('fetches events with steps - divisible range', async () => {
      const fetchEvents = sinon.stub().resolves([]);
      await shelteredBundlesRepository.collectEventsWithStep(151, 300, 50, fetchEvents, []);
      expect(fetchEvents).to.have.been.calledWith(151, 200);
      expect(fetchEvents).to.have.been.calledWith(201, 250);
      expect(fetchEvents).to.have.been.calledWith(251, 300);
    });

    it('fetches events with steps - range with remainder', async () => {
      const fetchEvents = sinon.stub().resolves([]);
      await shelteredBundlesRepository.collectEventsWithStep(151, 215, 50, fetchEvents, []);
      expect(fetchEvents).to.have.been.calledWith(151, 200);
      expect(fetchEvents).to.have.been.calledWith(201, 215);
    });

    it('fetches events with steps - range of 1', async () => {
      const fetchEvents = sinon.stub()
        .withArgs(5, 5)
        .resolves([{blockNumber: 0, logIndex: 0}]);
      const result = await shelteredBundlesRepository.collectEventsWithStep(5, 5, 100, fetchEvents, []);
      expect(result).to.deep.eq([{blockNumber: 0, logIndex: 0}]);
    });
  });
});
