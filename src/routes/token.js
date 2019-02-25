/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import bodyParser from '../middlewares/body_parser';
import ambAuthorizationHeaderMiddleware from '../middlewares/amb_authorization_header_middleware';
import ensureJsonMime from '../middlewares/mime_middleware';

export const createTokenHandler = (tokenAuthenticator) => (req, res) => {
  const token = tokenAuthenticator.generateToken(req.ambSecret, req.body.validUntil);
  res.status(201).send({token});
};

const tokenRouter = (tokenAuthenticator, config) => {
  const router = new express.Router();
  router.post('/',
    ensureJsonMime,
    bodyParser(config),
    ambAuthorizationHeaderMiddleware(config),
    createTokenHandler(tokenAuthenticator)
  );
  return router;
};

export default tokenRouter;
