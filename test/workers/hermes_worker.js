/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import chai from 'chai';
import sinon from 'sinon';
import HermesWorker from '../../src/workers/hermes_worker';

const {expect} = chai;

describe('Hermes Worker', () => {
  const bundleSizeLimit = 10;
  const storagePeriods = 1;
  let mockDataModelEngine;
  let mockConfig;
  let mockLogger;
  let mockResult;
  let hermesWorker;

  beforeEach(async () => {
    mockDataModelEngine = {
      finaliseBundle: sinon.stub()
    };
    mockConfig = {
      bundleSizeLimit,
      storagePeriods
    };
    mockLogger = {
      info: sinon.stub()
    };
    mockResult = {
      bundleId: '0xc0ffee'
    };
    hermesWorker = new HermesWorker(mockDataModelEngine, mockConfig, mockLogger);
    await hermesWorker.beforeWorkLoop();
  });

  afterEach(async () => {
    await hermesWorker.afterWorkLoop();
  });

  it('executes bundle finalisation correctly', async () => {
    mockDataModelEngine.finaliseBundle.resolves(null);
    await hermesWorker.periodicWork();
    expect(mockDataModelEngine.finaliseBundle).to.have.been.calledWith(hermesWorker.bundleSequenceNumber - 1, bundleSizeLimit, storagePeriods);
  });

  it('increments bundleSequenceNumber', async () => {
    mockDataModelEngine.finaliseBundle.resolves(null);
    const bundleSequenceNumberBefore = hermesWorker.bundleSequenceNumber;
    await hermesWorker.periodicWork();
    const bundleSequenceNumberAfter = hermesWorker.bundleSequenceNumber;
    expect(bundleSequenceNumberAfter - bundleSequenceNumberBefore).to.equal(1);
  });

  it('uses logger once if nothing was uploaded', async () => {
    mockDataModelEngine.finaliseBundle.resolves(null);
    await hermesWorker.periodicWork();
    expect(mockLogger.info).to.have.been.calledOnce;
  });

  it('uses logger twice if bundle was uploaded', async () => {
    mockDataModelEngine.finaliseBundle.resolves(mockResult);
    await hermesWorker.periodicWork();
    expect(mockLogger.info).to.have.been.calledTwice;
  });
});
