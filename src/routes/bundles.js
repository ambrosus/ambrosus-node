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
