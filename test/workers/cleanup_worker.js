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
import CleanupWorker from '../../src/workers/cleanup_worker';

chai.use(sinonChai);
chai.use(chaiAsPromised);
const {expect} = chai;

describe('Cleanup worker', () => {
  let mockDataModelEngine;
  let mockWorkerTaskTracker;
  let logger;
  let worker;
  const exampleWorkId = 'workId';
  const exampleWorkerInterval = 86400;

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    };
    mockWorkerTaskTracker = {
      tryToBeginWork: sinon.stub().resolves(exampleWorkId),
      finishWork: sinon.spy()
    };
    mockDataModelEngine = {
      cleanupOutdatedBundles: sinon.stub()
    };
    worker = new CleanupWorker(mockDataModelEngine, mockWorkerTaskTracker, logger, exampleWorkerInterval);
  });

  describe('periodicWork', () => {
    it('calls cleanupOutdatedBundles method', async () => {
      await worker.periodicWork();
      expect(mockDataModelEngine.cleanupOutdatedBundles).to.be.calledOnce;
      expect(logger.info).to.be.calledOnce;
    });

    it('starts and ends AtlasChallengeResolution task', async () => {
      await worker.periodicWork();
      expect(mockWorkerTaskTracker.tryToBeginWork).to.be.calledBefore(mockDataModelEngine.cleanupOutdatedBundles);
      expect(mockWorkerTaskTracker.tryToBeginWork).to.be.calledOnceWith('BundleCleanup');
      expect(mockWorkerTaskTracker.finishWork).to.be.calledAfter(mockDataModelEngine.cleanupOutdatedBundles);
      expect(mockWorkerTaskTracker.finishWork).to.be.calledOnceWith(exampleWorkId);
    });

    it('should end task even if an error was thrown', async () => {
      mockDataModelEngine.cleanupOutdatedBundles.rejects();
      await expect(worker.periodicWork()).to.be.rejected;
      expect(mockWorkerTaskTracker.finishWork).to.be.calledOnceWith(exampleWorkId);
    });

    it('logs error when cleanupOutdatedBundles fails', async () => {
      mockDataModelEngine.cleanupOutdatedBundles.rejects(new Error('Oh No!'));
      await expect(worker.periodicWork()).to.be.rejected;
      expect(logger.error).to.be.calledOnce;
    });
  });
});
