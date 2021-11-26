/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.io

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';

export const getBundleHandler = (modelEngine) => async (req, res) => {
  const bundleStream = await modelEngine.getBundleStream(req.params.bundleId);
  res.status(200).type('json');
  bundleStream.pipe(res);
};

export const getBundleMetadataHandler = (modelEngine) => async (req, res) => {
  const result = await modelEngine.getBundleMetadata(req.params.bundleId);
  res.status(200)
    .type('json')
    .send(JSON.stringify(result));
};

export const getBundleRestoreHandler = (modelEngine) => async (req, res) => {
  try {
    await modelEngine.tryRestoreBundle(req.params.bundleId);
    res.status(200)
      .type('json')
      .send(JSON.stringify({status: 'success'}));
  } catch (err) {
    res.status(500)
      .type('json')
      .send(JSON.stringify({status: 'error', reason: err.message || err}));
  }
};

const bundlesRouter = (modelEngine) => {
  const router = new express.Router();
  router.get('/:bundleId',
    asyncMiddleware(getBundleHandler(modelEngine))
  );
  router.get('/:bundleId/info',
    asyncMiddleware(getBundleMetadataHandler(modelEngine))
  );
//   router.get('/:bundleId/restore',
//     asyncMiddleware(getBundleRestoreHandler(modelEngine))
//   );
  return router;
};

export default bundlesRouter;
