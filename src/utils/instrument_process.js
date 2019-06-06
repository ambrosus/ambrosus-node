
/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
import * as Sentry from '@sentry/node';
import {WinstonConsoleLogger} from './loggers';
import config from '../config/config';

export const serializeError = (error) => Object.getOwnPropertyNames(error).reduce(
  (accum, key) => {
    accum[key] = error[key];
    return accum;
  },
  {name: error.name});

const reportAndExit = async (sentryClient, logger, message, error) => {
  logger.error({message, error: serializeError(error)});
  sentryClient.captureException(error);
  await sentryClient.getCurrentHub().getClient()
    .close(2000);
  process.exit(1);
};

export const instrumentProcess = (startFn, sentryClient, logger) => {
  sentryClient.init({
    dsn: config.sentryDSN,
    environment: process.env.NODE_ENV,
    ignoreErrors: config.sentryIgnoreRegex ? new RegExp(config.sentryIgnoreRegex) : []
  });

  process.once('unhandledRejection', (error) => {
    reportAndExit(
      sentryClient,
      logger,
      'unhandledRejection bubbled up to the process',
      error
    );
  });

  process.once('uncaughtException', (error) => {
    reportAndExit(
      sentryClient,
      logger,
      'uncaughtException bubbled up to the process',
      error
    );
  });

  startFn(logger);
};

export const setup = (start) => {
  const logger = new WinstonConsoleLogger();
  instrumentProcess(start, Sentry, logger);
};
