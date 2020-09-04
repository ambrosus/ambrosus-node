
/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/
const prometheusMetricsHandler = (registry) => (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(registry.metrics());
};

export default prometheusMetricsHandler;
