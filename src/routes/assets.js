import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import presignerMiddleware from '../middlewares/presigner_middleware';
import prehasherMiddleware from '../middlewares/prehasher_middleware';

import {ValidationError} from '../errors/errors';



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
  const event = await modelEngine.getEvent(req.params.eventId);
  res.status(200)
    .type('json')
    .send(JSON.stringify(event));
};

const assetRouter = (identityManager, modelEngine) => {
  const router = new express.Router();

  router.post('/',
    bodyParser.json(),
    presignerMiddleware(identityManager),
    prehasherMiddleware(identityManager, 'content', 'assetId'),
    asyncMiddleware(createAssetHandler(modelEngine))
  );

  router.get('/:assetId',
    asyncMiddleware(fetchAssetHandler(modelEngine))
  );

  router.post('/:assetId/events',
    bodyParser.json(),
    prehasherMiddleware(identityManager, 'content.data', 'content.idData.dataHash'),
    presignerMiddleware(identityManager),
    prehasherMiddleware(identityManager, 'content', 'eventId'),
    asyncMiddleware(createEventHandler(modelEngine))
  );

  router.get('/:assetId/events/:eventId',
    asyncMiddleware(fetchEventHandler(modelEngine))
  );

  return router;
};

export default assetRouter;
