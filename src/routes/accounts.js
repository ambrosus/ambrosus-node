import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';


const createAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.createAccount();
  res.status(201).send({content});
};

const getAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.getAccount(req.params.id);
  res.status(200).send({content});
};

export default (dataModelEngine) => {
  const router = new express.Router();
  router.post('/', asyncMiddleware(createAccountHandler(dataModelEngine)));
  router.get('/:id', asyncMiddleware(getAccountHandler(dataModelEngine)));
  return router;
};


