/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {createLogger, format, transports} from 'winston';

export class Logger {
  info() {
    throw new Error('Logger::info: Abstract method');
  }

  error() {
    throw new Error('Logger::error: Abstract method');
  }
}

export class WinstonConsoleLogger extends Logger {
  constructor() {
    super();
    this.logger = createLogger({
      format: format.combine(
        format.timestamp(),
        format.json(),
      ),
      transports: [
        new transports.Console()
      ]
    });
  }

  info(message) {
    this.logger.info(message);
  }

  error(error) {
    this.logger.error(error.stack || error);
  }
}

export class WinstonExpressLogger extends Logger {
  constructor() {
    super();
    const logFormat = format.printf((info) => info.message);
    this.logger = createLogger({
      format: logFormat,
      transports: [
        new transports.Console()
      ]
    });
  }

  info(message) {
    this.logger.info(message);
  }

  error(err) {
    this.logger.error(JSON.stringify({
      type: 'error',
      message: err.message,
      stackTrace: err.stack
    }, null, 4));
  }
}
