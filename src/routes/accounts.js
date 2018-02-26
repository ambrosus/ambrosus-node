import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import presignerMiddleware from '../middlewares/presigner_middleware';
import ambAuthorizationHeaderMiddleware from '../middlewares/amb_authorization_header_middleware';

const createAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.createAccount(req.body.content);
  res.status(201).send({content});
};

const getAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.getAccount(req.params.id);
  res.status(200).send({content});
};

export default (identityManager, dataModelEngine) => {
  const router = new express.Router();
  router.post('/', 
    bodyParser.json(),
    ambAuthorizationHeaderMiddleware,
    presignerMiddleware(identityManager),
    asyncMiddleware(createAccountHandler(dataModelEngine)));
  router.get('/:id', asyncMiddleware(getAccountHandler(dataModelEngine)));
  return router;
};


