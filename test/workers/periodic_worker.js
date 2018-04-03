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
  let initSpy;
  let workStub;
  const interval = 10000;

  before(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    worker = new PeriodicWorker(interval);
    initSpy = sinon.spy(worker, 'init');
    workStub = sinon.stub(worker, 'work');
    workStub.resolves();
  });

  afterEach(() => {
    clearInterval(worker.timerId);
    initSpy.restore();
    workStub.restore();
  });

  after(() => {
    clock.restore();
  });

  it('should call init on start', async () => {
    await expect(worker.start()).to.have.been.fulfilled;

    expect(initSpy).to.have.been.calledOnce;
  });

  it('should not allow start to be called twice', async () => {
    await expect(worker.start()).to.be.fulfilled;
    await expect(worker.start()).to.be.rejected;
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
