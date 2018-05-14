/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com
Developers: Marek Kirejczyk, Antoni Kedracki, Ivan Rukhavets, Bartlomiej Rutkowski

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {InvalidParametersError} from '../errors/errors';
import {get, put} from '../utils/dict_utils';

const prehasherMiddleware = (identityManager, toHashPath = 'content', hashPath = 'id') => ((req, res, next) => {
  const toHash = get(req.body, toHashPath);
  if (toHash === undefined) {
    throw new InvalidParametersError(`No content found at ${toHashPath}`);
  }

  const hash = identityManager.calculateHash(toHash);
  req.body = put(req.body, hashPath, hash);
  next();
});

export default prehasherMiddleware;

