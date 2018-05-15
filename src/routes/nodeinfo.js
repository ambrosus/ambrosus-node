/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';

export const getNodeInfoHandler = (identityManager) => (req, res) => {
  require('pkginfo')(module, 'version');
  res.status(200).send({
    version: module.exports.version,
    nodeAddress: identityManager.nodeAddress()
  });
};

const nodeInfoRouter = (identityManager) => {
  const router = new express.Router();
  router.get('/',
    getNodeInfoHandler(identityManager)
  );
  return router;
};

export default nodeInfoRouter;
