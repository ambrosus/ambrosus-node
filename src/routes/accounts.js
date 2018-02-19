import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import bodyParser from 'body-parser';
import presignerMiddleware from '../middlewares/presigner_middleware';

const createAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.createAccount(req.body.content.idData, req.body.content.signature);
  res.status(201).send({content});
};

const getAccountHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.getAccount(req.params.id);
  res.status(200).send({content});
};

const updatePermissions = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.updatePermissions(req.body.idData, req.body.signature);
  res.status(200).send({content});
};

export default (identityManager, dataModelEngine) => {
  const router = new express.Router();
  router.post('/',
    bodyParser.json(),
    presignerMiddleware(identityManager),
    asyncMiddleware(createAccountHandler(dataModelEngine)));
  router.get('/:id', asyncMiddleware(getAccountHandler(dataModelEngine)));
  router.put('/permissions',
    bodyParser.json(),
    presignerMiddleware(identityManager, 'idData', 'signature'),
    asyncMiddleware(updatePermissions(dataModelEngine)));
  return router;
};


