import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import presignerMiddleware from '../middlewares/presigner_middleware';
import prehasherMiddleware from '../middlewares/prehasher_middleware';

import {put} from '../utils/dict_utils';
import {ValidationError} from '../errors/errors';


const addLinkToMetadata = (asset, linkHelper) => put(asset, 'metadata.link', linkHelper.linkForAsset(asset.assetId));

export const createAssetHandler = (modelEngine, linkHelper) => async (req, res) => {
  const createdAsset = await modelEngine.createAsset(req.body);
  const createdAssetWithMetadata = addLinkToMetadata(createdAsset, linkHelper);

  res.status(201)
    .type('json')
    .send(JSON.stringify(createdAssetWithMetadata));
};

export const fetchAssetHandler = (modelEngine, linkHelper) => async (req, res) => {
  const asset = await modelEngine.getAsset(req.params.assetId);
  const assetWithMetadata = addLinkToMetadata(asset, linkHelper);
  res.status(200)
    .type('json')
    .send(JSON.stringify(assetWithMetadata));
};

export const createEventHandler = (modelEngine, linkHelper) => async (req, res) => {
  if (req.params.assetId !== req.body.content.idData.assetId) {
    throw new ValidationError('The assetId in the path mismatches the one in the event body');
  }
  
  const createdEvent = await modelEngine.createEvent(req.body);
  const createdEventWithMetadata = put(createdEvent, 'metadata.link', linkHelper.linkForEvent(createdEvent.content.idData.assetId, createdEvent.eventId));

  res.status(201)
    .type('json')
    .send(JSON.stringify(createdEventWithMetadata));
  res.status(201).send();
};

const assetRouter = (identityManager, modelEngine, linkHelper) => {
  const router = new express.Router();

  router.post('/',
    bodyParser.json(),
    presignerMiddleware(identityManager),
    asyncMiddleware(createAssetHandler(modelEngine, linkHelper)));

  router.get('/:assetId',
    asyncMiddleware(fetchAssetHandler(modelEngine, linkHelper))
  );

  router.post('/:assetId/events',
    bodyParser.json(),
    prehasherMiddleware(identityManager, 'content.data', 'content.idData.dataHash'),
    presignerMiddleware(identityManager),
    prehasherMiddleware(identityManager, 'content', 'eventId'),
    asyncMiddleware(createEventHandler(modelEngine, linkHelper)));

  return router;
};

export default assetRouter;
