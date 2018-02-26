import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';

export const findEventsHandler = (modelEngine) => async (req, res) => {
  const {results, resultCount} = await modelEngine.findEvents(req.query);
  res.status(200)
    .type('json')
    .send(JSON.stringify({
      results,
      resultCount
    }));
};

const eventsRouter = (identityManager, modelEngine) => {
  const router = new express.Router();

  router.get('/',
    asyncMiddleware(findEventsHandler(modelEngine))
  );

  return router;
};

export default eventsRouter;
