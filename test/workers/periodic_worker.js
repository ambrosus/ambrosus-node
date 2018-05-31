/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import PeriodicWorker from '../../src/workers/periodic_worker';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Periodic Worker', () => {
  let clock;
  let worker;
  let beforeStartSpy;
  let workStub;
  const interval = 10000;

  before(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    worker = new PeriodicWorker(interval);
    beforeStartSpy = sinon.spy(worker, 'beforeStart');
    workStub = sinon.stub(worker, 'work');
    workStub.resolves();
  });

  afterEach(() => {
    clearInterval(worker.timerId);
    beforeStartSpy.restore();
    workStub.restore();
  });

  after(() => {
    clock.restore();
  });

  it('should call beforeStart when the worker is started', async () => {
    await expect(worker.start()).to.have.been.fulfilled;

    expect(beforeStartSpy).to.have.been.calledOnce;
  });

  it('should not allow start to be called twice', async () => {
    await expect(worker.start()).to.be.fulfilled;
    await expect(worker.start()).to.be.rejected;

    expect(beforeStartSpy).to.have.been.calledOnce;
  });

  it('should execute the work method exactly every 10 seconds', async () => {
    await expect(worker.start()).to.be.fulfilled;

    expect(workStub).to.not.have.been.called;
    clock.tick(interval);
    expect(workStub).to.have.been.calledOnce;
    clock.tick(interval - 1);
    expect(workStub).to.have.been.calledOnce;
    clock.tick(1);
    expect(workStub).to.have.been.calledTwice;
  });
});
