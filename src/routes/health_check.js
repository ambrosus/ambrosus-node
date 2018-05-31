/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

const healthCheckHandler = (mongoClient, web3) => async (req, res) => {
  if (!mongoClient.isConnected()) {
    res.status(500)
      .type('json')
      .send({msg: 'Is not connected to MongoDB'});
    return;
  }

  try {
    await web3.eth.getNodeInfo();
  } catch (err) {
    res.status(500)
      .type('json')
      .send({msg: 'Failed to call getNodeInfo'});
    return;
  }

  res.status(200)
    .type('json')
    .send();
};

export default healthCheckHandler;
