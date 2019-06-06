/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Builder from '../../../src/builder';
import config from '../../../src/config/config';
import {cleanDatabase} from '../../../src/utils/db_utils';
import CleanupWorker from '../../../src/workers/cleanup_worker';
import {createBundle} from '../../fixtures/assets_events';
import BundleStatuses from '../../../src/utils/bundle_statuses';

chai.use(sinonChai);
const {expect} = chai;

describe('Cleanup worker – integration', () => {
  let builder;
  let loggerSpy;
  const now = 150000000;
  let clock;
  let worker;

  before(async () => {
    builder = new Builder();
    await builder.build({...config, headContractAddress: '0x0000000000000000000000000000000000000F10'});
  });

  beforeEach(async () => {
    loggerSpy = {info: sinon.spy()};
    clock = sinon.useFakeTimers(now);
    worker = new CleanupWorker(builder.dataModelEngine, builder.workerTaskTrackingRepository, loggerSpy, 300);
  });

  afterEach(async () => {
    await cleanDatabase(builder.db);
    clock.restore();
  });

  describe('periodicWorker', () => {
    it('cannot start two workers simultaneously', async () => {
      const firstWorkerPendingProcess = worker.periodicWork();
      await worker.periodicWork();
      await firstWorkerPendingProcess;
      expect(loggerSpy.info).to.be.calledOnce;
    });

    it('can start jobs one after another', async () => {
      await worker.periodicWork();
      await worker.periodicWork();
      expect(loggerSpy.info).to.be.calledTwice;
    });
  });

  describe('clean up bundles', () => {
    const storeBundle = async (bundleId, status, metadata) => {
      await builder.bundleRepository.storeBundle({...createBundle(), bundleId}, 10);
      if (!status) {
        return;
      }
      await builder.bundleRepository.setBundleRepository(bundleId, status, metadata);
    };

    beforeEach(async () => {
      await storeBundle('bundle0');
      await storeBundle('bundle1', BundleStatuses.downloaded, {holdUntil: new Date(now + 1)});
      await storeBundle('bundle2', BundleStatuses.sheltered, {holdUntil: new Date(now)});
      await storeBundle('bundle3', BundleStatuses.cleanup);
      await storeBundle('bundle4', BundleStatuses.downloaded, {holdUntil: new Date(now - 1)});
      await storeBundle('bundle5', BundleStatuses.sheltered, {holdUntil: new Date(now - 2)});
    });

    it('removes all outdated bundles and bundles without repository field', async () => {
      await worker.periodicWork();

      expect(await builder.bundleRepository.getBundle('bundle0')).to.be.null;
      expect(await builder.bundleRepository.getBundle('bundle1')).to.be.not.null;
      expect(await builder.bundleRepository.getBundle('bundle2')).to.be.not.null;
      expect(await builder.bundleRepository.getBundle('bundle3')).to.be.null;
      expect(await builder.bundleRepository.getBundle('bundle4')).to.be.null;
      expect(await builder.bundleRepository.getBundle('bundle5')).to.be.null;
    });

    it('sets removed bundle status to EXPENDABLE', async () => {
      const getBundleStatus = async (bundleId) => (await builder.bundleRepository.getBundleRepository(bundleId)).status;
      await worker.periodicWork();

      expect(await getBundleStatus('bundle0')).to.be.equal(BundleStatuses.expendable);
      expect(await getBundleStatus('bundle1')).to.be.equal(BundleStatuses.downloaded);
      expect(await getBundleStatus('bundle2')).to.be.equal(BundleStatuses.sheltered);
      expect(await getBundleStatus('bundle3')).to.be.equal(BundleStatuses.expendable);
      expect(await getBundleStatus('bundle4')).to.be.equal(BundleStatuses.expendable);
      expect(await getBundleStatus('bundle5')).to.be.equal(BundleStatuses.expendable);
    });
  });

  after(() => {
    builder.client.close();
  });
});
