import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import startBundleFinalisationWorker from '../../src/tasks/bundle_finalisation_worker';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Bundle finalisation service', () => {
  let clock;
  let finalise;
  let worker;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    finalise = sinon.stub();
    finalise.resolves();
  });

  it('should trigger finalisation every 15 seconds', async () => {
    worker = await startBundleFinalisationWorker({}, finalise);
    expect(finalise).to.be.not.called;
    clock.tick(15000);
    expect(finalise).calledOnce;
    clock.tick(15000);
    expect(finalise).calledTwice;
  });

  afterEach(() => {
    clearInterval(worker);
    clock.restore();
  });
});
