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
import config from '../../../config/config';
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
    worker = new CleanupWorker(builder.dataModelEngine, builder.workerTaskTrackingRepository, loggerSpy, 300);
    clock = sinon.useFakeTimers(now);
    for (let iter = 0; iter <= 5; iter++) {
      await builder.bundleRepository.storeBundle({...createBundle(), bundleId: `bundle${iter}`}, 10);
    }
    // don't set repository for bundle0
    await builder.bundleRepository.setBundleRepository('bundle1', BundleStatuses.downloaded, {holdUntil: new Date(now + 1)});
    await builder.bundleRepository.setBundleRepository('bundle2', BundleStatuses.sheltered, {holdUntil: new Date(now)});
    await builder.bundleRepository.setBundleRepository('bundle3', BundleStatuses.cleanup);
    await builder.bundleRepository.setBundleRepository('bundle4', BundleStatuses.downloaded, {holdUntil: new Date(now - 1)});
    await builder.bundleRepository.setBundleRepository('bundle5', BundleStatuses.sheltered, {holdUntil: new Date(now - 2)});
  });

  const shouldBeRemoved = [
    true,
    false,
    false,
    true,
    true,
    true
  ];

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

    it('removes all outdated bundles and bundles without repository field', async () => {
      await worker.periodicWork();

      for (let bundleIndex = 0; bundleIndex <= 5; bundleIndex++) {
        const bundle = await builder.bundleRepository.getBundle(`bundle${bundleIndex}`);
        if (shouldBeRemoved[bundleIndex]) {
          expect(bundle).to.be.null;
        } else {
          expect(bundle).to.be.not.null;
        }
      }
    });

    it('sets removed bundle status to EXPENDABLE', async () => {
      await worker.periodicWork();

      for (let bundleIndex = 0; bundleIndex <= 5; bundleIndex++) {
        const {status} = await builder.bundleRepository.getBundleRepository(`bundle${bundleIndex}`);
        if (shouldBeRemoved[bundleIndex]) {
          expect(status).to.be.equal(BundleStatuses.expendable);
        } else {
          expect(status).to.be.not.equal(BundleStatuses.expendable);
        }
      }
    });
  });

  after(() => {
    builder.client.close();
  });
});
