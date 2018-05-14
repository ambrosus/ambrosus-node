/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';

export const getBundleHandler = (modelEngine) => async (req, res) => {
  const result = await modelEngine.getBundle(req.params.bundleId);
  res.status(200)
    .type('json')
    .send(JSON.stringify(result));
};

const bundlesRouter = (modelEngine) => {
  const router = new express.Router();
  router.get('/:bundleId',
    asyncMiddleware(getBundleHandler(modelEngine))
  );
  return router;
};

export default bundlesRouter;
