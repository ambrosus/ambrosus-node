import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import presignerMiddleware from '../middlewares/presigner_middleware';

import {put} from '../utils/dict_utils';

export const createAssetHandler = (modelEngine, linkHelper) => async (req, res) => {
  const createdAsset = await modelEngine.createAsset(req.body);
  const createdAssetWithMetadata = put(createdAsset, 'metadata.link', linkHelper.linkForAsset(createdAsset.assetId));

  res.status(201)
    .type('json')
    .send(JSON.stringify(createdAssetWithMetadata));
};

const assetRouter = (identityManager, modelEngine, linkHelper) => {
  const router = new express.Router();

  router.post('/',
    bodyParser.json(),
    presignerMiddleware(identityManager),
    asyncMiddleware(createAssetHandler(modelEngine, linkHelper)));

  return router;
};

export default assetRouter;
