import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';

import {put} from '../utils/dict_utils';

const addLinkToEventMetadata = (event, linkHelper) => put(
  event,
  'metadata.link',
  linkHelper.linkForEvent(event.content.idData.assetId, event.eventId)
);

export const findEventsHandler = (modelEngine, linkHelper) => async (req, res) => {  
  const {results, resultCount} = await modelEngine.findEvents();
  const resultsWithMetadata = results.map((event) => addLinkToEventMetadata(event, linkHelper));
  res.status(200)
    .type('json')
    .send(JSON.stringify({
      results : resultsWithMetadata,
      resultCount
    }));
};

const eventsRouter = (identityManager, modelEngine, linkHelper) => {
  const router = new express.Router();

  router.get('/',
    asyncMiddleware(findEventsHandler(modelEngine, linkHelper))
  );

  return router;
};

export default eventsRouter;
