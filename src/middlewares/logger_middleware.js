/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import morgan from 'morgan';

export default (logger) => {
  morgan.token('req-head', (req) => req.headers);
  morgan.token('res-head', (req, res) => res.getHeaders());
  morgan.token('date', () => new Date().toISOString());

  return morgan((tokens, req, res) => JSON.stringify({
    type: 'request',
    timestamp: tokens.date(),
    httpVersion: tokens['http-version'](req, res),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    remoteAddress: tokens['remote-addr'](req, res),
    requestHeaders: tokens['req-head'](req, res),
    responseHeaders: tokens['res-head'](req, res),
    responseTime: `${tokens['response-time'](req, res)}ms`
  }), {
    stream: {write: (message) => logger.info(message)},
    skip: (req) => ['/health', '/metrics'].includes(req.url)
  });
};
