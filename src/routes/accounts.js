import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import accessTokenMiddleware from '../middlewares/access_token_middleware';

const createAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.createAccount(req.body.content, req.tokenData);
  res.status(201).send({content});
};

const getAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.getAccount(req.params.id);
  res.status(200).send({content});
};

export default (tokenAuthenticator, dataModelEngine) => {
  const router = new express.Router();
  router.post('/', 
    bodyParser.json(),  
    accessTokenMiddleware(tokenAuthenticator),
    asyncMiddleware(createAccountHandler(dataModelEngine)));
  router.get('/:id', asyncMiddleware(getAccountHandler(dataModelEngine)));
  return router;
};


