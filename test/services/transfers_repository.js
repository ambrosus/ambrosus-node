/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import TransfersRepository from '../../src/services/transfers_repository';
import sinon from 'sinon';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Transfers repository', () => {
  let transferWrapperMock;
  let configWrapperMock;
  let activeTransfersCacheMock;
  let blockchainStateWrapperMock;
  let transfersEventEmitterWrapper;
  let transfersRepository;

  describe('prepareResolutionEvent', () => {
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
      transfersRepository = new TransfersRepository();
    });

    it('extracts the blockNumber, logIndex, the fields specified in selector and appends event type', async () => {
      expect(transfersRepository.prepareEvents(events, ['transferId', 'donorId', 'bundleId'])).to.deep.equal([
        {donorId, bundleId, transferId, blockNumber: 1, logIndex: 0},
        {donorId, bundleId, transferId: 100, blockNumber: 2, logIndex: 0},
        {donorId, bundleId, transferId, blockNumber: 2, logIndex: 1}
      ]);
      expect(transfersRepository.prepareEvents(events, ['transferId'])).to.deep.equal([
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
    const fromBlock = 0;
    const latestBlock = 7;
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
      }];
    const resolvedEvents = [
      {
        blockNumber: 3,
        logIndex: 0,
        returnValues: {
          bundleId,
          donorId,
          transferId: 'resolved',
          resolverId: 'someResolverId'
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
      };
      activeTransfersCacheMock = {
        applyIncomingResolutionEvents: sinon.stub(),
        activeResolutions: ['activeResolutions']
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
        .resolves(latestBlock + 3);
      transfersRepository = new TransfersRepository(transferWrapperMock, transfersEventEmitterWrapper, configWrapperMock, blockchainStateWrapperMock, activeTransfersCacheMock);
      sinon.spy(transfersRepository, 'prepareEvents');
    });

    it('on first call: gets transfers from earliest possible block and caches them', async () => {
      const result = await transfersRepository.ongoingResolutions();
      expect(transfersEventEmitterWrapper.transfers).to.be.calledWith(fromBlock, latestBlock);
      expect(transfersEventEmitterWrapper.resolvedTransfers).to.be.calledWith(fromBlock, latestBlock);
      expect(transfersEventEmitterWrapper.cancelledTransfers).to.be.calledWith(fromBlock, latestBlock);
      expect(result).to.deep.equal(activeTransfersCacheMock.activeResolutions);
    });

    it('on second call: gets transfers since previously resolved block', async () => {
      await transfersRepository.ongoingResolutions();
      await transfersRepository.ongoingResolutions();
      expect(transfersEventEmitterWrapper.transfers).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(transfersEventEmitterWrapper.resolvedTransfers).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(transfersEventEmitterWrapper.cancelledTransfers).to.be.calledWith(latestBlock + 1, latestBlock + 3);
      expect(transfersRepository.lastSavedBlock).to.equal(latestBlock + 3);
    });

    it('does not fetch new transfers when currentBlock equals lastSavedBlock', async () => {
      blockchainStateWrapperMock.getCurrentBlockNumber.onSecondCall().resolves(latestBlock);
      await transfersRepository.ongoingResolutions();
      await transfersRepository.ongoingResolutions();
      expect(transfersEventEmitterWrapper.transfers).to.be.calledOnce;
      expect(transfersEventEmitterWrapper.resolvedTransfers).to.be.calledOnce;
      expect(transfersEventEmitterWrapper.cancelledTransfers).to.be.calledOnce;
    });

    it('adds new transfers to cache, removes resolved and cancelled', async () => {
      await transfersRepository.ongoingResolutions();
      expect(activeTransfersCacheMock.applyIncomingResolutionEvents).to.be.calledOnceWithExactly(
        transfersRepository.prepareEvents(events, ['transferId', 'donorId', 'bundleId']),
        transfersRepository.prepareEvents(resolvedEvents, ['transferId']),
        transfersRepository.prepareEvents(cancelledEvents, ['transferId'])
      );
    });

    it('calls own methods with correct params', async () => {
      await transfersRepository.ongoingResolutions();
      expect(transfersRepository.prepareEvents).to.be.calledThrice;
      expect(transfersRepository.prepareEvents).to.be.calledWith(events);
      expect(transfersRepository.prepareEvents).to.be.calledWith(resolvedEvents);
      expect(transfersRepository.prepareEvents).to.be.calledWith(cancelledEvents);
    });

    it('fetches events with steps - collects all events', async () => {
      const fetchEvents = sinon.stub();
      fetchEvents.withArgs(0, 0)
        .resolves([{blockNumber: 0, logIndex: 0}]);
      fetchEvents.withArgs(1, 1)
        .resolves([{blockNumber: 1, logIndex: 1}]);
      fetchEvents.withArgs(2, 2)
        .resolves([{blockNumber: 2, logIndex: 2}]);
      const result = await transfersRepository.collectEventsWithStep(0, 2, 1, fetchEvents, []);
      expect(result).to.deep.eq([{blockNumber: 0, logIndex: 0}, {blockNumber: 1, logIndex: 1}, {blockNumber: 2, logIndex: 2}]);
    });

    it('fetches events with steps - divisible range', async () => {
      const fetchEvents = sinon.stub().resolves([]);
      await transfersRepository.collectEventsWithStep(151, 300, 50, fetchEvents, []);
      expect(fetchEvents).to.have.been.calledWith(151, 200);
      expect(fetchEvents).to.have.been.calledWith(201, 250);
      expect(fetchEvents).to.have.been.calledWith(251, 300);
    });

    it('fetches events with steps - range with remainder', async () => {
      const fetchEvents = sinon.stub().resolves([]);
      await transfersRepository.collectEventsWithStep(151, 215, 50, fetchEvents, []);
      expect(fetchEvents).to.have.been.calledWith(151, 200);
      expect(fetchEvents).to.have.been.calledWith(201, 215);
    });

    it('fetches events with steps - range of 1', async () => {
      const fetchEvents = sinon.stub()
        .withArgs(5, 5)
        .resolves([{blockNumber: 0, logIndex: 0}]);
      const result = await transfersRepository.collectEventsWithStep(5, 5, 100, fetchEvents, []);
      expect(result).to.deep.eq([{blockNumber: 0, logIndex: 0}]);
    });
  });

  describe('resolveTransfer', () => {
    const donorId = 'donor';
    const bundleId = 'bundle';
    const transferId = 'transfer';
    const transfer1 = {donorId, bundleId, transferId, bundleNumber: 1};

    beforeEach(() => {
      transferWrapperMock = {
        resolve: sinon.stub(),
        canResolve: sinon.stub().resolves(true)
      };
      transfersRepository = new TransfersRepository(transferWrapperMock);
    });

    it('calls contract method with correct arguments', async () => {
      await transfersRepository.resolve(transfer1);
      expect(transferWrapperMock.resolve).to.be.calledOnceWith(transfer1.transferId);
    });

    it('throws error if cannot resolve transfer', async () => {
      transferWrapperMock.canResolve.resolves(false);
      await expect(transfersRepository.resolve(transfer1)).to.be.eventually.rejected;
      expect(transferWrapperMock.resolve).to.be.not.called;
    });
  });
});
