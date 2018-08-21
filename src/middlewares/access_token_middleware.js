/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {ValidationError, AuthenticationError} from '../errors/errors';
import {getTimestamp} from '../utils/time_utils';

const accessTokenMiddleware = (tokenAuthenticator, required = true) => ((req, res, next) => {
  if (!required) {
    next();
    return;
  }

  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    throw new AuthenticationError('Authorization AMB_TOKEN header not found');
  }

  const [type, token] = authorizationHeader.split(' ');
  if (type !== 'AMB_TOKEN') {
    throw new ValidationError(`Expected Authorization type AMB_TOKEN`);
  }

  const {idData} = tokenAuthenticator.decodeToken(token, getTimestamp());
  req.tokenData = idData;
  next();
});

export default accessTokenMiddleware;

