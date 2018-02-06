import express from 'express';
import asyncMiddleware from '../middlewares/async_middleware';

const router = new express.Router();

router.get('/', asyncMiddleware(async (req, res) => {
  res.status(200).send('Test');
}));

export default router;
