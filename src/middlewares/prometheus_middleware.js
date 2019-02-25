/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
const excludedPaths = ['/health', '/metrics'];

const prometheusMiddleware = (promClient, registry) => {
  const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Request duration in seconds',
    buckets: promClient.linearBuckets(0.1, 0.2, 15),
    registers: [registry]
  });
  const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['status'],
    registers: [registry]
  });

  return (req, res, next) => {
    if (!excludedPaths.includes(req.path)) {
      const endTimer = httpRequestDurationSeconds.startTimer();

      res.on('finish', () => {
        endTimer();
        httpRequestsTotal.inc({status: res.statusCode});
      });
    }
    next();
  };
};

export default prometheusMiddleware;
