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

const eventsRouter = (tokenAuthenticator, identityManager, modelEngine) => {
  const router = new express.Router();

  router.get('/',
    accessTokenMiddleware(tokenAuthenticator, false),
    queryParameterProcessorMiddleware,
    asyncMiddleware(findEventsHandler(modelEngine))
  );

  return router;
};

export default eventsRouter;
