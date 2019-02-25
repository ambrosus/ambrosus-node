/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const healthCheckHandler = (mongoClient, web3) => async (req, res) => {
  const status = {
    mongo: {connected: true},
    web3: {connected: true}
  };

  if (!mongoClient.isConnected()) {
    status.mongo.connected = false;
  }

  try {
    await web3.eth.getNodeInfo();
  } catch (err) {
    status.web3.connected = false;
  }

  if (!status.mongo.connected || !status.web3.connected) {
    res.status(500)
      .type('json')
      .send(status);
  } else {
    res.status(200)
      .type('json')
      .send();
  }
};

export default healthCheckHandler;
