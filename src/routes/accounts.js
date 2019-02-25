/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';
import accessTokenMiddleware from '../middlewares/access_token_middleware';
import bodyParser from '../middlewares/body_parser';
import ensureJsonMime from '../middlewares/mime_middleware';

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

export const findAccountsHandler = (dataModelEngine) => async (req, res) => {
  const content = await dataModelEngine.findAccounts(req.query, req.tokenData);
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

export default (tokenAuthenticator, dataModelEngine, config) => {
  const router = new express.Router();

  router.post('/',
    ensureJsonMime,
    bodyParser(config),
    accessTokenMiddleware(tokenAuthenticator),
    asyncMiddleware(addAccountHandler(dataModelEngine)));

  router.get('/:id',
    accessTokenMiddleware(tokenAuthenticator),
    asyncMiddleware(getAccountHandler(dataModelEngine)));

  router.get('/',
    accessTokenMiddleware(tokenAuthenticator),
    asyncMiddleware(findAccountsHandler(dataModelEngine)));

  router.put('/:id',
    ensureJsonMime,
    bodyParser(config),
    accessTokenMiddleware(tokenAuthenticator),
    asyncMiddleware(modifyAccountHandler(dataModelEngine)));


  return router;
};


