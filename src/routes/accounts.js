import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';


export default (dataModelEngine) => {
  const router = new express.Router();
  router.post('/', asyncMiddleware(async (req, res) => {
    const content = dataModelEngine.createAccount();
    res.status(200).send({content});
  }));

  return router;
};


