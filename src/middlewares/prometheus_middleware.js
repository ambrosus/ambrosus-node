/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
const excludedPaths = ['/health', '/metrics'];

const prometheusMiddleware = (promClient) => {
  const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Request duration in seconds',
    buckets: promClient.linearBuckets(0.1, 0.2, 20),
    labelNames: ['path', 'status']
  });

  return (req, res, next) => {
    if (!excludedPaths.includes(req.path)) {
      // Save req.path in a local variable because it changed during
      // `res.on('finish')` to `/`.
      const {path} = req;
      const endTimer = httpRequestDurationSeconds.startTimer();

      res.on('finish', () => endTimer({
        path,
        status: res.statusCode
      }));
    }
    next();
  };
};

export default prometheusMiddleware;
