/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import accessTokenMiddleware from '../middlewares/access_token_middleware';
import queryParameterProcessorMiddleware from '../middlewares/query_parameter_processor_middleware';

export const findEventsHandler = (modelEngine) => async (req, res) => {
  const {results, resultCount} = await modelEngine.findEvents(req.query, req.tokenData);
  res.status(200)
    .type('json')
    .send(JSON.stringify({
      results,
      resultCount
    }));
};

export const fetchEventHandler = (modelEngine) => async (req, res) => {
  const event = await modelEngine.getEvent(req.params.eventId, req.tokenData);
  res.status(200)
    .type('json')
    .send(JSON.stringify(event));
};

const eventsRouter = (tokenAuthenticator, identityManager, modelEngine) => {
  const router = new express.Router();

  router.get('/',
    accessTokenMiddleware(tokenAuthenticator, false),
    queryParameterProcessorMiddleware,
    asyncMiddleware(findEventsHandler(modelEngine))
  );

  router.get('/:eventId',
    accessTokenMiddleware(tokenAuthenticator, false),
    asyncMiddleware(fetchEventHandler(modelEngine))
  );

  return router;
};

export default eventsRouter;
