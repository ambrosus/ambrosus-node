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

import BundlesRestorer from '../../src/services/bundles_restorer';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Bundles Restorer', () => {
  let restorer;
  let getShelterersCall;
  let getUploaderCall;
  let bundleStoreWrapperMock;
  let bundleRepositoryMock;
  let shelteringWrapperMock;
  let dataModelEngineMock;
  let shelteredBundlesRepositoryMock;
  let workerLoggerMock;
  let bundleStoreContractMock;

  const timestamp = 1500000000;

  beforeEach(async () => {
    getShelterersCall = {
      call: sinon.stub().resolves(['donor1', 'donor2', 'donor3', 'shelterer'])
    };
    getUploaderCall = {
      call: sinon.stub().resolves('uploader')
    };
    bundleStoreContractMock = {
      methods: {
        getShelterers: sinon.stub().returns(getShelterersCall),
        getUploader: sinon.stub().returns(getUploaderCall)
      }
    };
    bundleStoreWrapperMock = {
      contract: sinon.stub().resolves(bundleStoreContractMock)
    };
    shelteringWrapperMock = {
      shelteringExpirationDate: sinon.stub().resolves(timestamp)
    };
    dataModelEngineMock = {
      downloadBundle: sinon.spy(),
      markBundleAsSheltered: sinon.stub()
    };
    bundleRepositoryMock = {
      getShelteredBundles: sinon.stub().resolves([])
    };
    shelteredBundlesRepositoryMock = {
      load: sinon.stub(),
      ongoingResolutions: sinon.stub().resolves([])
    };
    workerLoggerMock = {
      addLog: sinon.spy(),
      logger: {
        info: sinon.spy()
      }
    };
    restorer = new BundlesRestorer(bundleStoreWrapperMock, shelteringWrapperMock, dataModelEngineMock, bundleRepositoryMock, shelteredBundlesRepositoryMock, workerLoggerMock);
  });

  it('call with empty data works', async () => {
    sinon.spy(restorer, 'getBundleDonors');
    await restorer.restore();
    expect(bundleRepositoryMock.getShelteredBundles).to.be.calledOnce;
    expect(shelteredBundlesRepositoryMock.ongoingResolutions).to.be.calledOnce;
    expect(restorer.getBundleDonors).to.not.have.been.called;
    expect(shelteringWrapperMock.shelteringExpirationDate).to.not.have.been.called;
    expect(dataModelEngineMock.downloadBundle).to.not.have.been.called;
    expect(dataModelEngineMock.markBundleAsSheltered).to.not.have.been.called;
  });

  it('get bundle donors works', async () => {
    sinon.spy(restorer, 'getBundleDonors');
    expect(await restorer.getBundleDonors({bundleId: 1, shelterer: 'shelterer'})).to.deep.equal(['donor1', 'donor2', 'donor3', 'uploader']);
  });

  it('restore works', async () => {
    const shelterer = 'shelterer';
    bundleRepositoryMock.getShelteredBundles.resolves([{bundleId: 2}, {bundleId: 3}, {bundleId: 5}]);
    shelteredBundlesRepositoryMock.ongoingResolutions.resolves([{bundleId: 1, shelterer}, {bundleId: 2, shelterer}, {bundleId: 3, shelterer}, {bundleId: 4, shelterer}, {bundleId: 5, shelterer}]);
    sinon.stub(restorer, 'getBundleDonors');
    restorer.getBundleDonors.withArgs({bundleId: 1, shelterer}).resolves(['bundle1.donor1']);
    restorer.getBundleDonors.withArgs({bundleId: 4, shelterer}).resolves(['bundle4.donor1']);
    await restorer.restore();
    expect(restorer.dataModelEngine.downloadBundle).to.have.been.calledWith(1, 'bundle1.donor1', timestamp);
    expect(restorer.dataModelEngine.downloadBundle).to.have.been.calledWith(4, 'bundle4.donor1', timestamp);
  });
});
