import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';


const createAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = dataModelEngine.createAccount();
  res.status(201).send({content});
};

export default (dataModelEngine) => {
  const router = new express.Router();
  router.post('/', asyncMiddleware(createAccountHandler(dataModelEngine)));
  return router;
};


