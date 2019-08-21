/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import RetireTransfersRepository from '../../src/services/retire_transfers_repository';
import sinon from 'sinon';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Retire transfers repository', () => {
  let configWrapperMock;
  let blockchainStateWrapperMock;
  let transfersEventEmitterWrapper;
  let retireTransfersRepository;

  describe('prepareEvents', () => {
    const donorId = 1;
    const bundleId = 2;
    const transferId = 3;
    const events = [
      {
        returnValues: {
          donorId,
          bundleId,
          transferId
        },
        blockNumber: 1,
        logIndex: 0
      },
      {
        returnValues: {
          donorId,
          bundleId,
          transferId: 100
        },
        blockNumber: 2,
        logIndex: 0
      },
      {
        returnValues: {
          donorId,
          bundleId,
          transferId
        },
        blockNumber: 2,
        logIndex: 1
      }];

    beforeEach(() => {
      retireTransfersRepository = new RetireTransfersRepository();
    });

    it('extracts the blockNumber, logIndex, the fields specified in selector and appends event type', async () => {
      expect(retireTransfersRepository.prepareEvents(events, ['transferId', 'donorId', 'bundleId'])).to.deep.equal([
        {donorId, bundleId, transferId, blockNumber: 1, logIndex: 0},
        {donorId, bundleId, transferId: 100, blockNumber: 2, logIndex: 0},
        {donorId, bundleId, transferId, blockNumber: 2, logIndex: 1}
      ]);
      expect(retireTransfersRepository.prepareEvents(events, ['transferId'])).to.deep.equal([
        {transferId, blockNumber: 1, logIndex: 0},
        {transferId: 100, blockNumber: 2, logIndex: 0},
        {transferId, blockNumber: 2, logIndex: 1}
      ]);
    });
  });

  describe('ongoingTransfers', () => {
    const donorId = 1;
    const bundleId = 2;
    const transferId = 3;
    const fromBlock = 4;
    const latestBlock = 7;
    const challengeDuration = 15;
    const events = [
      {
        blockNumber: 4,
        logIndex: 0,
        returnValues: {
          donorId,
          bundleId,
          transferId
        }
      }, {
        blockNumber: 2,
        logIndex: 0,
        returnValues: {
          donorId,
          bundleId,
          transferId: 100
        }
      }, {
        blockNumber: 2,
        logIndex: 1,
        returnValues: {
          donorId,
          bundleId,
          transferId: 'resolved'
        }
      }, {
        blockNumber: 2,
        logIndex: 2,
        returnValues: {
          donorId,
          bundleId,
          transferId: 'cancelled'
        }
      }];
    const resolvedEvents = [
      {
        blockNumber: 3,
        logIndex: 0,
        returnValues: {
          bundleId,
          donorId,
          transferId: 'resolved',
          recipientId: 'someResolverId'
        }
      }];
    const cancelledEvents = [
      {
        blockNumber: 5,
        logIndex: 0,
        returnValues: {
          bundleId,
          donorId,
          transferId: 'cancelled'
        }
      }];

    beforeEach(() => {
      configWrapperMock = {
        challengeDuration: sinon.stub().resolves(challengeDuration)
      };
      blockchainStateWrapperMock = {
        getCurrentBlockNumber: sinon.stub()
      };
      transfersEventEmitterWrapper = {
        transfers: sinon.stub().resolves(events),
        resolvedTransfers: sinon.stub().resolves(resolvedEvents),
        cancelledTransfers: sinon.stub().resolves(cancelledEvents)
      };
      blockchainStateWrapperMock.getCurrentBlockNumber.onFirstCall()
        .resolves(latestBlock)
        .onSecondCall()
        .resolves(latestBlock)
        .onThirdCall(2)
        .resolves(latestBlock + 3);
      retireTransfersRepository = new RetireTransfersRepository(transfersEventEmitterWrapper, blockchainStateWrapperMock, configWrapperMock, donorId);
      sinon.spy(retireTransfersRepository, 'prepareEvents');
    });

    it('on first call: gets transfers from earliest possible block and caches them', async () => {
      const result = await retireTransfersRepository.ongoingTransfers();
      expect(configWrapperMock.challengeDuration).to.be.calledOnce;
      expect(transfersEventEmitterWrapper.transfers).to.be.calledWith(fromBlock, latestBlock);
      expect(transfersEventEmitterWrapper.resolvedTransfers).to.be.calledWith(fromBlock, latestBlock);
      expect(transfersEventEmitterWrapper.cancelledTransfers).to.be.calledWith(fromBlock, latestBlock);
      expect(result).to.deep.equal(Object.values(retireTransfersRepository.activeTransfers));
    });

    it('on second call: gets transfers since previously resolved block', async () => {
      await retireTransfersRepository.ongoingTransfers();
      await retireTransfersRepository.ongoingTransfers();
      expect(transfersEventEmitterWrapper.transfers).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(transfersEventEmitterWrapper.resolvedTransfers).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(transfersEventEmitterWrapper.cancelledTransfers).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(retireTransfersRepository.lastSavedBlock).to.equal(latestBlock + 3);
    });

    it('does not fetch new transfers when currentBlock equals lastSavedBlock', async () => {
      blockchainStateWrapperMock.getCurrentBlockNumber.onThirdCall().resolves(latestBlock);
      await retireTransfersRepository.ongoingTransfers();
      await retireTransfersRepository.ongoingTransfers();
      expect(transfersEventEmitterWrapper.transfers).to.be.calledOnce;
      expect(transfersEventEmitterWrapper.resolvedTransfers).to.be.calledOnce;
      expect(transfersEventEmitterWrapper.cancelledTransfers).to.be.calledOnce;
    });

    it('adds new transfers to cache, removes resolved and cancelled', async () => {
      sinon.spy(retireTransfersRepository, 'applyIncomingTransferEvents');
      await retireTransfersRepository.ongoingTransfers();
      expect(retireTransfersRepository.applyIncomingTransferEvents).to.be.calledOnceWithExactly(
        retireTransfersRepository.prepareEvents(events, ['transferId', 'donorId', 'bundleId']),
        retireTransfersRepository.prepareEvents(resolvedEvents, ['transferId']),
        retireTransfersRepository.prepareEvents(cancelledEvents, ['transferId'])
      );
      expect(retireTransfersRepository.resolvedTransfers).to.deep.eq([{bundleId, donorId, transferId: 'resolved', blockNumber: 2, logIndex: 1}]);
    });

    it('flush resolved transfers at get', async () => {
      await retireTransfersRepository.ongoingTransfers();
      expect(retireTransfersRepository.resolvedTransfers).to.deep.eq([{bundleId, donorId, transferId: 'resolved', blockNumber: 2, logIndex: 1}]);
      expect(retireTransfersRepository.flushResolvedTransfers()).to.deep.eq([{bundleId, donorId, transferId: 'resolved', blockNumber: 2, logIndex: 1}]);
      expect(retireTransfersRepository.resolvedTransfers.length).to.be.equal(0);
    });

    it('calls own methods with correct params', async () => {
      await retireTransfersRepository.ongoingTransfers();
      expect(retireTransfersRepository.prepareEvents).to.be.calledThrice;
      expect(retireTransfersRepository.prepareEvents).to.be.calledWith(events);
      expect(retireTransfersRepository.prepareEvents).to.be.calledWith(resolvedEvents);
      expect(retireTransfersRepository.prepareEvents).to.be.calledWith(cancelledEvents);
    });

    it('fetches events with steps - collects all events', async () => {
      const fetchEvents = sinon.stub();
      fetchEvents.withArgs(0, 0)
        .resolves([{blockNumber: 0, logIndex: 0}]);
      fetchEvents.withArgs(1, 1)
        .resolves([{blockNumber: 1, logIndex: 1}]);
      fetchEvents.withArgs(2, 2)
        .resolves([{blockNumber: 2, logIndex: 2}]);
      const result = await retireTransfersRepository.collectEventsWithStep(0, 2, 1, fetchEvents, []);
      expect(result).to.deep.eq([{blockNumber: 0, logIndex: 0}, {blockNumber: 1, logIndex: 1}, {blockNumber: 2, logIndex: 2}]);
    });

    it('fetches events with steps - divisible range', async () => {
      const fetchEvents = sinon.stub().resolves([]);
      await retireTransfersRepository.collectEventsWithStep(151, 300, 50, fetchEvents, []);
      expect(fetchEvents).to.have.been.calledWith(151, 200);
      expect(fetchEvents).to.have.been.calledWith(201, 250);
      expect(fetchEvents).to.have.been.calledWith(251, 300);
    });

    it('fetches events with steps - range with remainder', async () => {
      const fetchEvents = sinon.stub().resolves([]);
      await retireTransfersRepository.collectEventsWithStep(151, 215, 50, fetchEvents, []);
      expect(fetchEvents).to.have.been.calledWith(151, 200);
      expect(fetchEvents).to.have.been.calledWith(201, 215);
    });

    it('fetches events with steps - range of 1', async () => {
      const fetchEvents = sinon.stub()
        .withArgs(5, 5)
        .resolves([{blockNumber: 0, logIndex: 0}]);
      const result = await retireTransfersRepository.collectEventsWithStep(5, 5, 100, fetchEvents, []);
      expect(result).to.deep.eq([{blockNumber: 0, logIndex: 0}]);
    });
  });
});
