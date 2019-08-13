/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import AtlasWorker from '../../src/workers/atlas_worker';
import {AtlasResolver} from '../../src/workers/atlas_resolvers/atlas_resolver';
import {connectToMongo} from '../../src/utils/db_utils';
import config from '../../src/config/config';
import Web3 from 'web3';
import getAvailableDiskSpace from '../../src/utils/disk_usage';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Atlas Worker', () => {
  const defaultAccount = '0x123';
  const enoughFunds = '10000000000000000000';
  const fetchedBundleMetadata = {bundleId: 'fetchedBundle'};
  const exampleWorkId = 'workid';
  const {utils} = new Web3();
  let atlasWorker;
  let workerTaskTrackingRepositoryMock;
  let dataModelEngineMock;
  let workerLoggerMock;
  let mockWeb3;
  let loggerMock;
  let port;
  let mockResolver;
  let operationalModeMock;
  let releaseBundlesServiceMock;

  const createMockResolver = () => {
    mockResolver = {
      addMetrics: sinon.stub(),
      resolveOne: sinon.stub(),
      resolveAll: sinon.stub()
    };
    mockResolver.__proto__ = AtlasResolver.prototype;
  };

  beforeEach(async () => {
    mockWeb3 = {
      eth: {
        defaultAccount,
        getBalance: sinon.stub().resolves(enoughFunds),
        getNodeInfo: () => Promise.resolve()
      },
      utils
    };
    const {client: mongoClient} = await connectToMongo(config);
    workerTaskTrackingRepositoryMock = {
      tryToBeginWork: sinon.stub().resolves(exampleWorkId),
      finishWork: sinon.spy()
    };
    dataModelEngineMock = {
      downloadBundle: sinon.stub().resolves(fetchedBundleMetadata),
      cleanupBundles: sinon.spy(),
      markBundleAsSheltered: sinon.stub()
    };
    loggerMock = {
      info: sinon.spy(),
      error: sinon.spy()
    };
    workerLoggerMock = {
      logger: loggerMock,
      addLog: sinon.spy()
    };
    operationalModeMock = {
      isRetire: sinon.stub().returns(false)
    };
    releaseBundlesServiceMock = {
      reset: sinon.stub()
    };
    createMockResolver();
    const resolvers = [mockResolver];

    atlasWorker = new AtlasWorker(
      mockWeb3,
      dataModelEngineMock,
      workerLoggerMock,
      workerTaskTrackingRepositoryMock,
      mongoClient,
      resolvers,
      operationalModeMock,
      config,
      releaseBundlesServiceMock
    );

    atlasWorker.resolveByOne = true;
    atlasWorker.beforeWorkLoop();
    ({port} = atlasWorker.server.address());
  });

  afterEach(async () => {
    await atlasWorker.afterWorkLoop();
  });

  it('set the work interval into constructor', () => {
    expect(atlasWorker.interval).to.equal(config.atlasWorkerInterval);
  });

  it('setup the resolver metrics into constructor', () => {
    expect(mockResolver.addMetrics).to.be.calledOnce;
  });

  it('resolver resolveOne was called', async () => {
    await atlasWorker.periodicWork();
    expect(mockResolver.resolveOne).to.be.calledOnce;
  });

  it('resolver resolveAll was called', async () => {
    atlasWorker.resolveByOne = false;
    await atlasWorker.periodicWork();
    expect(mockResolver.resolveAll).to.be.calledOnce;
    atlasWorker.resolveByOne = true;
  });

  describe('isEnoughFundsToPayForGas', () => {
    async function checkWithNoFunds() {
      mockWeb3.eth.getBalance.withArgs(defaultAccount).resolves(0);
      return await atlasWorker.isEnoughFundsToPayForGas();
    }

    async function checkWithEnoughFunds() {
      mockWeb3.eth.getBalance.withArgs(defaultAccount).resolves(enoughFunds);
      return await atlasWorker.isEnoughFundsToPayForGas();
    }

    it('returns true when account has enough funds to pay for gas', async () => {
      await expect(checkWithEnoughFunds()).to.eventually.be.true;
    });

    it('returns false when account does not have enough funds to pay for gas', async () => {
      await expect(checkWithNoFunds()).to.eventually.be.false;
    });

    it('returns true when account has enough funds after it was out of funds', async () => {
      await checkWithNoFunds();
      await expect(checkWithEnoughFunds()).to.eventually.be.true;
    });

    it('writes message to log when outOfFunds is raised for the first time in a row', async () => {
      await checkWithNoFunds();
      expect(workerLoggerMock.addLog).to.be.calledOnce;

      await checkWithEnoughFunds();
      expect(workerLoggerMock.addLog).to.be.calledOnce;

      await checkWithNoFunds();
      expect(workerLoggerMock.addLog).to.be.calledTwice;
    });

    it('does not write message to log again until still out of funds', async () => {
      await checkWithNoFunds();
      await checkWithNoFunds();
      await checkWithNoFunds();

      expect(workerLoggerMock.addLog).to.be.calledOnce;
    });
  });

  it('periodicWork does not do anything when account does not have enough funds to pay for gas', async () => {
    mockWeb3.eth.getBalance.resolves('10');
    await expect(atlasWorker.periodicWork()).to.be.eventually.fulfilled;
    await expect(mockResolver.resolveOne).to.be.not.called;
  });

  describe('isEnoughAvailableDiskSpace', () => {
    let availableDiskSpace;
    async function checkWithNotEnoughSpace() {
      atlasWorker.requiredFreeDiskSpace = availableDiskSpace * 2;
      return atlasWorker.isEnoughAvailableDiskSpace();
    }

    async function checkWithEnoughSpace() {
      atlasWorker.requiredFreeDiskSpace = availableDiskSpace / 2;
      return atlasWorker.isEnoughAvailableDiskSpace();
    }

    before(async () => {
      availableDiskSpace = await getAvailableDiskSpace();
    });

    it('returns true when the machine has enough free disk space', async () => {
      await expect(checkWithEnoughSpace()).to.eventually.be.true;
    });

    it('returns false when the machine does not have enough free disk space', async () => {
      await expect(checkWithNotEnoughSpace()).to.eventually.be.false;
    });

    it('returns true when the machine got enough free disk space after it was out of it', async () => {
      await checkWithNotEnoughSpace();
      await expect(checkWithEnoughSpace()).to.eventually.be.true;
    });

    it('writes message to log when outOfSpace is raised for the first time in a row', async () => {
      await checkWithNotEnoughSpace();
      expect(workerLoggerMock.addLog).to.be.calledOnce;

      await checkWithEnoughSpace();
      expect(workerLoggerMock.addLog).to.be.calledOnce;

      await checkWithNotEnoughSpace();
      expect(workerLoggerMock.addLog).to.be.calledTwice;
    });

    it('does not write message to log again until still not enough free space', async () => {
      await checkWithNotEnoughSpace();
      await checkWithNotEnoughSpace();
      await checkWithNotEnoughSpace();

      expect(workerLoggerMock.addLog).to.be.calledOnce;
    });

    it('periodicWork does not do anything when there is less free space than required', async () => {
      atlasWorker.requiredFreeDiskSpace = availableDiskSpace * 2;
      await expect(atlasWorker.periodicWork()).to.be.eventually.fulfilled;
      await expect(mockResolver.resolveOne).to.be.not.called;
    });
  });

  it('health checks', async () => {
    const {status} = await chai.request(`http://localhost:${port}`).get('/health');
    expect(status).to.eql(200);
  });
});
