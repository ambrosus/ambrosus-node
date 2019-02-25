/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import Worker from '../../src/workers/worker';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Worker', () => {
  let worker;
  let workStub;
  let teardownStub;
  const logger = {};

  beforeEach(() => {
    worker = new Worker(logger);
    workStub = sinon.stub(worker, 'work');
    teardownStub = sinon.stub(worker, 'teardown');

    workStub.resolves();
    teardownStub.resolves();
  });

  afterEach(() => {
    workStub.restore();
    teardownStub.restore();
  });

  it('saves the logger', () => {
    expect(worker.logger).to.equal(logger);
  });

  describe('start', () => {
    beforeEach(async () => {
      await worker.start();
    });

    it('sets the started flag', async () => {
      expect(worker.started).to.be.true;
    });

    it('calls the work method', async () => {
      expect(workStub).to.have.been.calledOnce;
    });

    it('is not allowed to be called twice', async () => {
      await expect(worker.start()).to.be.rejected;

      expect(workStub).to.have.been.calledOnce; // still called only once
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await worker.start();
      await worker.stop();
    });

    it('resets the started flag', async () => {
      expect(worker.started).to.be.false;
    });

    it('calls the teardown method', async () => {
      expect(teardownStub).to.have.been.calledOnce;
    });

    it('is not allowed to be called before calling start first', async () => {
      await expect(worker.stop()).to.be.rejected;
    });
  });
});
