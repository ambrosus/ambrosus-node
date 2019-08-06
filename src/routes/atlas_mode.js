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

export const getModeInfoHandler = (operationalMode) => async (req, res) => {
  const modeInfo = operationalMode.getModeInfo();
  if (null !== modeInfo && undefined !== modeInfo) {
    res.status(200)
      .type('json')
      .send(modeInfo);
  } else {
    res.status(200)
      .type('json')
      .send();
  }
};

export const setModeHandler = (operationalMode) => async (req, res) => {
  try {
    await operationalMode.setMode(req.body);
    res.status(200).send();
  } catch (err) {
    res.status(401)
      .type('json')
      .send();
  }
};

const atlasModeRouter = (operationalMode, config) => {
  const router = new express.Router();
  router.get('/',
    asyncMiddleware(getModeInfoHandler(operationalMode))
  );
  router.post('/',
    ensureJsonMime,
    bodyParser(config),
    setModeHandler(operationalMode)
  );
  return router;
};

export default atlasModeRouter;
