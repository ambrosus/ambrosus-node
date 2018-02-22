import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import {put} from '../utils/dict_utils';

export const findEventsHandler = (modelEngine) => async (req, res) => {
  const supportedQueryParams = ['assetId'];
  // note: could also be done with underscore.js pick method :P
  const filteredQueryParams = Object
    .keys(req.query)
    .filter((key) => supportedQueryParams.includes(key))
    .reduce(
      (ret, key) => put(ret, key, req.query[key]),
      {});

  const {results, resultCount} = await modelEngine.findEvents(filteredQueryParams);
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
