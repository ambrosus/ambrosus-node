import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import startBundleFinalisationWorker from '../../src/tasks/bundle_finalisation_worker';
import Config from '../../src/utils/config';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Bundle finalisation service', () => {
  let clock;
  let finalise;
  let worker;
  const time = 10000;

  before(() => {
    clock = sinon.useFakeTimers();
    sinon.stub(Config, 'get').returns(time);
  });

  beforeEach(() => {
    finalise = sinon.stub();
    finalise.resolves();
  });

  it('should trigger finalisation exactly every 10 seconds', async () => {
    worker = await startBundleFinalisationWorker({}, finalise);
    expect(finalise).to.be.not.called;
    clock.tick(time);
    expect(finalise).to.be.calledOnce;
    clock.tick(time - 1);
    expect(finalise).to.be.calledOnce;
    clock.tick(1);
    expect(finalise).to.be.calledTwice;
  });

  after(() => {
    Config.get.restore();
    clearInterval(worker);
    clock.restore();
  });
});
