/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {ValidationError} from '../errors/errors';
import {get, put} from '../utils/dict_utils';

const prehasherMiddleware = (identityManager, toHashPath = 'content', hashPath = 'id') => ((req, res, next) => {
  const existingHash = get(req.body, hashPath);
  if (existingHash !== undefined) {
    next();
    return;
  }

  const toHash = get(req.body, toHashPath);
  if (toHash === undefined) {
    throw new ValidationError(`No content found at ${toHashPath}`);
  }

  const hash = identityManager.calculateHash(toHash);
  req.body = put(req.body, hashPath, hash);
  next();
});

export default prehasherMiddleware;

