import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import presignerMiddleware from '../middlewares/presigner_middleware';
import prehasherMiddleware from '../middlewares/prehasher_middleware';

import {put} from '../utils/dict_utils';
import {ValidationError} from '../errors/errors';


const addLinkToAssetMetadata = (asset, linkHelper) => put(
  asset, 
  'metadata.link', 
  linkHelper.linkForAsset(asset.assetId)
);
const addLinkToEventMetadata = (event, linkHelper) => put(
  event, 
  'metadata.link', 
  linkHelper.linkForEvent(event.content.idData.assetId, event.eventId)
);

export const createAssetHandler = (modelEngine, linkHelper) => async (req, res) => {
  const createdAsset = await modelEngine.createAsset(req.body);
  const createdAssetWithMetadata = addLinkToAssetMetadata(createdAsset, linkHelper);

  res.status(201)
    .type('json')
    .send(JSON.stringify(createdAssetWithMetadata));
};

export const fetchAssetHandler = (modelEngine, linkHelper) => async (req, res) => {
  const asset = await modelEngine.getAsset(req.params.assetId);
  const assetWithMetadata = addLinkToAssetMetadata(asset, linkHelper);
  res.status(200)
    .type('json')
    .send(JSON.stringify(assetWithMetadata));
};

export const createEventHandler = (modelEngine, linkHelper) => async (req, res) => {
  if (req.params.assetId !== req.body.content.idData.assetId) {
    throw new ValidationError('The assetId in the path mismatches the one in the event body');
  }
  
  const createdEvent = await modelEngine.createEvent(req.body);
  const createdEventWithMetadata = addLinkToEventMetadata(createdEvent, linkHelper);

  res.status(201)
    .type('json')
    .send(JSON.stringify(createdEventWithMetadata));
  res.status(201).send();
};

export const fetchEventHandler = (modelEngine, linkHelper) => async (req, res) => {
  const event = await modelEngine.getEvent(req.params.eventId);
  const eventWithMetadata = addLinkToEventMetadata(event, linkHelper);
  res.status(200)
    .type('json')
    .send(JSON.stringify(eventWithMetadata));
};

const assetRouter = (identityManager, modelEngine, linkHelper) => {
  const router = new express.Router();

  router.post('/',
    bodyParser.json(),
    presignerMiddleware(identityManager),
    prehasherMiddleware(identityManager, 'content', 'assetId'),
    asyncMiddleware(createAssetHandler(modelEngine, linkHelper))
  );

  router.get('/:assetId',
    asyncMiddleware(fetchAssetHandler(modelEngine, linkHelper))
  );

  router.post('/:assetId/events',
    bodyParser.json(),
    prehasherMiddleware(identityManager, 'content.data', 'content.idData.dataHash'),
    presignerMiddleware(identityManager),
    prehasherMiddleware(identityManager, 'content', 'eventId'),
    asyncMiddleware(createEventHandler(modelEngine, linkHelper))
  );

  router.get('/:assetId/events/:eventId',
    asyncMiddleware(fetchEventHandler(modelEngine, linkHelper))
  );

  return router;
};

export default assetRouter;
