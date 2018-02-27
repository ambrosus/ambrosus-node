import express from 'express';
import bodyParser from 'body-parser';
import ambAuthorizationHeaderMiddleware from '../middlewares/amb_authorization_header_middleware';

export const createTokenHandler = (tokenAuthenticator) => (req, res) => {
  const token = tokenAuthenticator.generateToken(req.ambSecret, req.body.validUntil);
  res.status(201).send({token});
};

const tokenRouter = (tokenAuthenticator) => {
  const router = new express.Router();
  router.post('/',
    bodyParser.json(),
    ambAuthorizationHeaderMiddleware,
    createTokenHandler(tokenAuthenticator)
  );
  return router;
};

export default tokenRouter;
