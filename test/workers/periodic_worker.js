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
  let beforeWorkLoopSpy;
  let afterWorkLoopSpy;
  let periodicWorkStub;
  const interval = 10000;

  before(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    worker = new PeriodicWorker(interval);
    beforeWorkLoopSpy = sinon.spy(worker, 'beforeWorkLoop');
    afterWorkLoopSpy = sinon.spy(worker, 'afterWorkLoop');
    periodicWorkStub = sinon.stub(worker, 'periodicWork');
    periodicWorkStub.resolves();
  });

  afterEach(() => {
    beforeWorkLoopSpy.restore();
    afterWorkLoopSpy.restore();
    periodicWorkStub.restore();
  });

  after(() => {
    clock.restore();
  });

  describe('start', () => {
    beforeEach(async () => {
      await worker.start();
    });

    afterEach(async () => {
      await worker.stop();
    });

    it('stores the timerId', () => {
      expect(worker.timerId).to.not.be.null;
    });

    it('calls the beforeWorkLoop method', () => {
      expect(beforeWorkLoopSpy).to.have.been.calledOnce;
    });

    it(`doesn't call the afterWorkLoop method`, () => {
      expect(afterWorkLoopSpy).to.not.have.been.called;
    });

    it('begins execution of the periodicWork method exactly every interval', async () => {
      expect(periodicWorkStub).to.not.have.been.called;
      clock.tick(interval);
      expect(periodicWorkStub).to.have.been.calledOnce;
      clock.tick(interval - 1);
      expect(periodicWorkStub).to.have.been.calledOnce;
      clock.tick(1);
      expect(periodicWorkStub).to.have.been.calledTwice;
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await worker.start();
      clock.tick(interval);
      await worker.stop();
    });

    it('resets the timerId', () => {
      expect(worker.timerId).to.be.null;
    });

    it('calls the afterWorkLoop method', () => {
      expect(afterWorkLoopSpy).to.have.been.calledOnce;
    });

    it('stops execution of the periodicWork method', () => {
      expect(periodicWorkStub).to.have.been.calledOnce;
      clock.tick(interval);
      clock.tick(interval);
      expect(periodicWorkStub).to.have.been.calledOnce;
    });
  });
});
