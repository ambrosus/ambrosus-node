/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {ValidationError, PermissionError} from '../errors/errors';

const ambAuthorizationHeaderMiddleware = (config) => (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    next();
    return;
  }

  if (!config.authorizationWithSecretKeyEnabled) {
    throw new PermissionError('Authorization by secret key is not possible');
  }
  const [type, secret] = authorizationHeader.split(' ');
  if (type !== 'AMB') {
    throw new ValidationError(`Only Authorization type AMB is supported`);
  }
  req.ambSecret = secret;
  next();
};

export default ambAuthorizationHeaderMiddleware;

