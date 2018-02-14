import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import presignerMiddleware from '../middlewares/presigner_middleware';

import {put} from '../utils/dict_utils';


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

const assetRouter = (identityManager, modelEngine, linkHelper) => {
  const router = new express.Router();

  router.post('/',
    bodyParser.json(),
    presignerMiddleware(identityManager),
    asyncMiddleware(createAssetHandler(modelEngine, linkHelper)));


  router.get('/:assetId',
    asyncMiddleware(fetchAssetHandler(modelEngine, linkHelper))
  );

  return router;
};

export default assetRouter;
