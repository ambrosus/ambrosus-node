import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';

const router = new express.Router();

router.post('/', asyncMiddleware(async (req, res) => {
  const response = { content: { address: ""} };
  res.status(200).send();
}));

export default router;
