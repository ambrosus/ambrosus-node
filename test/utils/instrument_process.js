/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import chai from 'chai';
import * as sinon from 'sinon';
import {instrumentProcess, serializeError} from '../../src/utils/instrument_process';
import config from '../../src/config/config';

const {expect} = chai;

const waitUntilEventsProcessed = async () => new Promise((resolve) => {
  setImmediate(resolve);
});

describe('#instrumentProcess', () => {
  let sandbox;
  let startFn;
  let sentry;
  let sentryClose;
  let logger;
  let unhandledRejectionListeners;
  let uncaughtExceptionListeners;

  beforeEach(() => {
    unhandledRejectionListeners = process.listeners('unhandledRejection');
    uncaughtExceptionListeners = process.listeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('uncaughtException');

    sandbox = sinon.createSandbox();
    startFn = sandbox.spy();
    sentryClose = sandbox.stub().returns(Promise.resolve());
    sentry = {
      init: sandbox.spy(),
      captureException: sandbox.spy(),
      getCurrentHub: () => ({
        getClient: () => ({
          close: sentryClose
        })
      })
    };
    logger = {
      error: sandbox.spy()
    };
    sandbox.stub(process, 'exit');
  });

  afterEach(() => {
    sandbox.restore();
    unhandledRejectionListeners.forEach((listener) => {
      process.on('unhandledRejection', listener);
    });
    uncaughtExceptionListeners.forEach((listener) => {
      process.on('uncaughtException', listener);
    });
  });

  it('initiates the Sentry client', () => {
    instrumentProcess(startFn, sentry, logger);
    expect(sentry.init).to.have.been.calledOnceWith({
      dsn: config.sentryDSN,
      environment: process.env.NODE_ENV,
      ignoreErrors: []
    });
  });

  it('calls the startFn', () => {
    instrumentProcess(startFn, sentry, logger);
    expect(startFn).to.have.been.calledOnceWith(logger);
  });

  it('on unhanledRejection reports errors', async () => {
    const err = new Error('hodovic');
    const startFn = () => {
      Promise.reject(err);
    };
    instrumentProcess(startFn, sentry, logger);

    // wait after the pending events have been processed
    await waitUntilEventsProcessed();

    expect(logger.error).to.have.been.calledOnceWith({
      message: 'unhandledRejection bubbled up to the process',
      error: serializeError(err)
    });
    expect(sentry.captureException).to.have.been.calledOnceWith(err);
    expect(sentryClose).to.have.been.calledOnceWith(2000);
  });
});
