/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from '../middlewares/body_parser';
import presignerMiddleware from '../middlewares/presigner_middleware';
import prehasherMiddleware from '../middlewares/prehasher_middleware';

import {ValidationError} from '../errors/errors';
import ambAuthorizationHeaderMiddleware from '../middlewares/amb_authorization_header_middleware';
import accessTokenMiddleware from '../middlewares/access_token_middleware';
import ensureJsonMime from '../middlewares/mime_middleware';
import queryParameterProcessorMiddleware from '../middlewares/query_parameter_processor_middleware';

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

export const findAssetsHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.findAssets(req.query, req.tokenData);
  res.status(200)
    .type('json')
    .send(JSON.stringify(content));
};

const assetRouter = (tokenAuthenticator, identityManager, modelEngine, config) => {
  const router = new express.Router();

  router.post('/',
    ensureJsonMime,
    bodyParser(config),
    ambAuthorizationHeaderMiddleware(config),
    presignerMiddleware(identityManager),
    prehasherMiddleware(identityManager, 'content', 'assetId'),
    asyncMiddleware(createAssetHandler(modelEngine))
  );

  router.get('/:assetId',
    asyncMiddleware(fetchAssetHandler(modelEngine))
  );

  router.post('/:assetId/events',
    ensureJsonMime,
    bodyParser(config),
    ambAuthorizationHeaderMiddleware(config),
    prehasherMiddleware(identityManager, 'content.data', 'content.idData.dataHash'),
    presignerMiddleware(identityManager),
    prehasherMiddleware(identityManager, 'content', 'eventId'),
    asyncMiddleware(createEventHandler(modelEngine))
  );

  router.get('/:assetId/events/',
    accessTokenMiddleware(tokenAuthenticator, false),
    asyncMiddleware(findEventsPerAssetHandler(modelEngine))
  );

  router.get('/',
    accessTokenMiddleware(tokenAuthenticator, false),
    queryParameterProcessorMiddleware,
    asyncMiddleware(findAssetsHandler(modelEngine)));

  return router;
};

export default assetRouter;
