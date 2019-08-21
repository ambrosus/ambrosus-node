/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import bodyParser from '../middlewares/body_parser';
import ensureJsonMime from '../middlewares/mime_middleware';
import asyncMiddleware from '../middlewares/async_middleware';

export const getNodeInfoHandler = (modelEngine, identityManager, gitCommit, operationalMode) => async (req, res) => {
  const workerLogs = await modelEngine.getWorkerLogs();
  require('pkginfo')(module, 'version');
  if (operationalMode !== null) {
    const mode = await operationalMode.get();
    res.status(200).send({
      commit: gitCommit,
      version: module.exports.version,
      nodeAddress: identityManager.nodeAddress(),
      mode,
      workerLogs
    });
  } else {
    res.status(200).send({
      commit: gitCommit,
      version: module.exports.version,
      nodeAddress: identityManager.nodeAddress(),
      workerLogs
    });
  }
};

export const setModeHandler = (operationalMode) => async (req, res) => {
  try {
    await operationalMode.set(req.body);
    res.status(200).send();
  } catch (err) {
    res.status(401)
      .type('json')
      .send();
  }
};

const nodeInfoRouter = (modelEngine, identityManager, gitCommit, config, operationalMode) => {
  const router = new express.Router();
  router.get('/',
    asyncMiddleware(getNodeInfoHandler(modelEngine, identityManager, gitCommit, operationalMode))
  );
  router.post('/',
    ensureJsonMime,
    bodyParser(config),
    setModeHandler(operationalMode)
  );
  return router;
};

export default nodeInfoRouter;
