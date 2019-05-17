/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const healthCheckHandler = (isWorker) => (mongoClient, web3, dataModelEngine, maximalLogAgeInSeconds) => async (req, res) => {
  const status = {
    mongo: {connected: true},
    web3: {connected: true}
  };

  if (isWorker) {
    status.isWorkerActive = await dataModelEngine.areLogsRecent(maximalLogAgeInSeconds);
  }

  if (!mongoClient.isConnected()) {
    status.mongo.connected = false;
  }

  try {
    await web3.eth.getNodeInfo();
  } catch (err) {
    status.web3.connected = false;
  }

  if (!status.mongo.connected || !status.web3.connected || status.isWorkerActive === false) {
    res.status(500)
      .type('json')
      .send(status);
  } else {
    res.status(200)
      .type('json')
      .send();
  }
};

export const workerHealthCheckHandler = healthCheckHandler(true);
export const serverHealthCheckHandler = healthCheckHandler(false);
