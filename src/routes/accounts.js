import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import accessTokenMiddleware from '../middlewares/access_token_middleware';

export const addAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.addAccount(req.body, req.tokenData);
  res.status(201)
    .type('json')
    .send(JSON.stringify(content));
};

export const getAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.getAccount(req.params.id, req.tokenData);
  res.status(200)
    .type('json')
    .send(JSON.stringify(content));
};

export const modifyAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.modifyAccount(req.params.id, req.body, req.tokenData);
  res.status(200)
    .type('json')
    .send(JSON.stringify(content));
};

export default (tokenAuthenticator, dataModelEngine) => {
  const router = new express.Router();

  router.post('/', 
    bodyParser.json(),  
    accessTokenMiddleware(tokenAuthenticator),
    asyncMiddleware(addAccountHandler(dataModelEngine)));

  router.get('/:id',
    accessTokenMiddleware(tokenAuthenticator),
    asyncMiddleware(getAccountHandler(dataModelEngine)));

  router.put('/:id',
    bodyParser.json(),  
    accessTokenMiddleware(tokenAuthenticator),
    asyncMiddleware(modifyAccountHandler(dataModelEngine)));


  return router;
};


