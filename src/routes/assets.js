import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import presignerMiddleware from '../middlewares/presigner_middleware';
import prehasherMiddleware from '../middlewares/prehasher_middleware';

import {ValidationError} from '../errors/errors';
import ambAuthorizationHeaderMiddleware from '../middlewares/amb_authorization_header_middleware';
import accessTokenMiddleware from '../middlewares/access_token_middleware';

export const createAssetHandler = (modelEngine) => async (req, res) => {
  const createdAsset = await modelEngine.createAsset(req.body);

  res.status(201)
    .type('json')
    .send(JSON.stringify(createdAsset));
};

export const fetchAssetHandler = (modelEngine) => async (req, res) => {
  const asset = await modelEngine.getAsset(req.params.assetId);
  res.status(200)
    .type('json')
    .send(JSON.stringify(asset));
};

export const createEventHandler = (modelEngine) => async (req, res) => {
  if (req.params.assetId !== req.body.content.idData.assetId) {
    throw new ValidationError('The assetId in the path mismatches the one in the event body');
  }
  
  const createdEvent = await modelEngine.createEvent(req.body);

  res.status(201)
    .type('json')
    .send(JSON.stringify(createdEvent));
  res.status(201).send();
};

export const fetchEventHandler = (modelEngine) => async (req, res) => {
  const event = await modelEngine.getEvent(req.params.eventId, req.tokenData);
  res.status(200)
    .type('json')
    .send(JSON.stringify(event));
};

export const findEventsPerAssetHandler = (modelEngine) => async (req, res) => {
  const queryParams = {...req.query, assetId: req.params.assetId};
  const {results, resultCount} = await modelEngine.findEvents(queryParams, req.tokenData);
  res.status(200)
    .type('json')
    .send(JSON.stringify({
      results,
      resultCount
    }));
};

const assetRouter = (tokenAuthenticator, identityManager, modelEngine) => {
  const router = new express.Router();

  router.post('/',
    bodyParser.json(),
    ambAuthorizationHeaderMiddleware,
    presignerMiddleware(identityManager),
    prehasherMiddleware(identityManager, 'content', 'assetId'),
    asyncMiddleware(createAssetHandler(modelEngine))
  );

  router.get('/:assetId',
    asyncMiddleware(fetchAssetHandler(modelEngine))
  );

  router.post('/:assetId/events',
    bodyParser.json(),
    ambAuthorizationHeaderMiddleware,
    prehasherMiddleware(identityManager, 'content.data', 'content.idData.dataHash'),
    presignerMiddleware(identityManager),
    prehasherMiddleware(identityManager, 'content', 'eventId'),
    asyncMiddleware(createEventHandler(modelEngine))
  );

  router.get('/:assetId/events/:eventId',
    accessTokenMiddleware(tokenAuthenticator, false),
    asyncMiddleware(fetchEventHandler(modelEngine))
  );

  router.get('/:assetId/events/',
    accessTokenMiddleware(tokenAuthenticator, false),
    asyncMiddleware(findEventsPerAssetHandler(modelEngine))
  );

  return router;
};

export default assetRouter;
