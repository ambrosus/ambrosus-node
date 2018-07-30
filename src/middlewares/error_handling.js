/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  PermissionError
} from '../errors/errors';

export default (logger) => (err, req, res, next) => {
  let status;

  if (err instanceof ValidationError) {
    status = 400;
  } else if (err instanceof AuthenticationError) {
    status = 401;
  } else if (err instanceof PermissionError) {
    status = 403;
  } else if (err instanceof NotFoundError) {
    status = 404;
  } else {
    logger.error(err);
    status = 500;
  }

  res.status(status).send({reason: err.message});

  next();
};
