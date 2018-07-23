/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';

export const getNodeInfoHandler = (identityManager, gitCommit) => (req, res) => {
  require('pkginfo')(module, 'version');
  res.status(200).send({
    commit: gitCommit,
    version: module.exports.version,
    nodeAddress: identityManager.nodeAddress()
  });
};

const nodeInfoRouter = (identityManager, gitCommit) => {
  const router = new express.Router();
  router.get('/',
    asyncMiddleware(getNodeInfoHandler(identityManager, gitCommit))
  );
  return router;
};

export default nodeInfoRouter;
