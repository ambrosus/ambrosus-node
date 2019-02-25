/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';

export const getNodeInfoHandler = (modelEngine, identityManager, gitCommit) => async (req, res) => {
  const workerLogs = await modelEngine.getWorkerLogs();
  require('pkginfo')(module, 'version');
  res.status(200).send({
    commit: gitCommit,
    version: module.exports.version,
    nodeAddress: identityManager.nodeAddress(),
    workerLogs
  });
};

const nodeInfoRouter = (modelEngine, identityManager, gitCommit) => {
  const router = new express.Router();
  router.get('/',
    asyncMiddleware(getNodeInfoHandler(modelEngine, identityManager, gitCommit))
  );
  return router;
};

export default nodeInfoRouter;
