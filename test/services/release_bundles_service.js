/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import ReleaseBundlesService from '../../src/services/release_bundles_service';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Release Bundles Service', () => {
  let service;
  let bundleRepositoryMock;
  let shelteringWrapperMock;
  let shelteringTransfersWrapperMock;
  let retireTransfersRepositoryMock;
  let workerLoggerMock;
  let operationalModeMock;

  const bundles5 = [{bundleId:1}, {bundleId:2}, {bundleId:3}, {bundleId:4}, {bundleId:5}];

  before(async () => {
    bundleRepositoryMock = {
      removeBundle: sinon.spy(),
      getShelteredBundles: sinon.stub().resolves([])
    };
    retireTransfersRepositoryMock = {
      ongoingTransfers: sinon.stub().resolves([]),
      transferDone: sinon.spy(),
      flushResolvedTransfers: sinon.stub().returns([])
    };
    shelteringWrapperMock = {
    };
    shelteringTransfersWrapperMock = {
    };
    workerLoggerMock = {
      addLog: sinon.spy(),
      logger: {
        info: sinon.spy()
      }
    };
    operationalModeMock = {
      setInfo: sinon.spy(),
      isRetire: sinon.stub().resolves(true)
    };
    service = new ReleaseBundlesService(bundleRepositoryMock, shelteringWrapperMock, shelteringTransfersWrapperMock, retireTransfersRepositoryMock, workerLoggerMock, operationalModeMock, 10);
  });

  beforeEach(() => {
    shelteringWrapperMock.isSheltering = sinon.stub().resolves(true);
    shelteringTransfersWrapperMock.start = sinon.spy();
    service.reset();
  });

  it('call with empty data works', async () => {
    expect(service.shelteredBundles).to.be.null;
    await service.process();
    expect(bundleRepositoryMock.getShelteredBundles).to.be.calledOnce;
    expect(retireTransfersRepositoryMock.ongoingTransfers).to.be.calledOnce;
    expect(retireTransfersRepositoryMock.flushResolvedTransfers).to.be.calledOnce;
    expect(bundleRepositoryMock.removeBundle).to.not.have.been.called;
    expect(retireTransfersRepositoryMock.transferDone).to.not.have.been.called;
    expect(shelteringTransfersWrapperMock.start).to.not.have.been.called;
    expect(service.shelteredBundles.size).to.be.equal(0);
    expect(service.modeInfo).to.deep.equal({total: 0, transfers: 0, transfered: 0, started:0, extra:0, removed:0, now:0, failed:0});
  });

  it('start bundles transfers works', async () => {
    bundleRepositoryMock.getShelteredBundles.resolves(bundles5);
    await service.process();
    expect(bundleRepositoryMock.removeBundle).to.not.have.been.called;
    expect(retireTransfersRepositoryMock.transferDone).to.not.have.been.called;
    expect(service.shelteredBundles.size).to.be.equal(0);
    expect(service.modeInfo).to.deep.equal({total: 5, transfers: 5, transfered: 0, started:5, extra:0, removed:0, now:0, failed:0});
  });

  it('handling of start transfer errors works', async () => {
    bundleRepositoryMock.getShelteredBundles.resolves(bundles5);
    shelteringTransfersWrapperMock.start = sinon.stub().throws();
    await service.process();
    expect(bundleRepositoryMock.removeBundle).to.be.callCount(0);
    expect(retireTransfersRepositoryMock.transferDone).to.not.have.been.called;
    expect(service.shelteredBundles.size).to.be.equal(5);
    expect(service.modeInfo).to.deep.equal({total: 5, transfers: 0, transfered: 0, started:0, extra:0, removed:0, now:5, failed:5});
  });

  it('do not start transfers for non-sheltered bundles works', async () => {
    bundleRepositoryMock.getShelteredBundles.resolves(bundles5);
    shelteringWrapperMock.isSheltering.resolves(false);
    await service.process();
    expect(bundleRepositoryMock.removeBundle).to.be.callCount(5);
    expect(retireTransfersRepositoryMock.transferDone).to.not.have.been.called;
    expect(service.shelteredBundles.size).to.be.equal(0);
    expect(service.modeInfo).to.deep.equal({total: 5, transfers: 0, transfered: 5, started:0, extra:5, removed:5, now:0, failed:0});
  });

  it('remove bundles for resolved transfers works', async () => {
    bundleRepositoryMock.getShelteredBundles.resolves(bundles5);
    await service.process();
    expect(service.shelteredBundles.size).to.be.equal(0);
    retireTransfersRepositoryMock.ongoingTransfers.resolves([
      {transferId:1, donorId:1, bundleId:1},
      {transferId:3, donorId:1, bundleId:3},
      {transferId:4, donorId:1, bundleId:4},
      {transferId:5, donorId:1, bundleId:5}
    ]);
    retireTransfersRepositoryMock.flushResolvedTransfers.returns([{transferId:2, donorId:1, bundleId:2}]);
    await service.process();
    expect(bundleRepositoryMock.removeBundle).to.be.calledWith(2);
    expect(retireTransfersRepositoryMock.transferDone).to.be.calledWith(2);
    expect(service.shelteredBundles.size).to.be.equal(0);
    expect(service.modeInfo).to.deep.equal({total: 5, transfers: 4, transfered: 1, started:5, extra:0, removed:1, now:0, failed:0});

    retireTransfersRepositoryMock.ongoingTransfers.resolves([
      {transferId:1, donorId:1, bundleId:1},
      {transferId:3, donorId:1, bundleId:3},
      {transferId:4, donorId:1, bundleId:4}
    ]);
    retireTransfersRepositoryMock.flushResolvedTransfers.returns([{transferId:5, donorId:1, bundleId:5}]);
    await service.process();
    expect(bundleRepositoryMock.removeBundle).to.be.calledWith(5);
    expect(retireTransfersRepositoryMock.transferDone).to.be.calledWith(5);
    expect(service.shelteredBundles.size).to.be.equal(0);
    expect(service.modeInfo).to.deep.equal({total: 5, transfers: 3, transfered: 2, started:5, extra:0, removed:2, now:0, failed:0});
  });
});
