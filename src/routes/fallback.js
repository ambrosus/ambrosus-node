/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import express from 'express';
import {NotFoundError} from '../errors/errors';

const fallbackRouter = (config) => {
  const router = new express.Router();
  router.use('*', () => {
    throw new NotFoundError(`Unknown path, see API documentation at: ${config.docsLink}`);
  });
  return router;
};

export default fallbackRouter;
