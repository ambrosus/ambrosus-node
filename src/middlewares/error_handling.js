/*
Copyright: Ambrosus Technologies GmbH
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {
  AuthenticationError,
  InvalidParametersError,
  NotFoundError,
  PermissionError,
  ValidationError
} from '../errors/errors';

export default (err, req, res, next) => {
  if (err instanceof InvalidParametersError || err instanceof ValidationError) {
    res.status(400).send({reason: err.message});
  } else if (err instanceof AuthenticationError) {
    res.status(401).send({reason: err.message});
  } else if (err instanceof PermissionError) {
    res.status(403).send({reason: err.message});
  } else if (err instanceof NotFoundError) {
    res.status(404).send({reason: err.message});
  } else {
    console.error(err);
    res.status(500).send({reason: err.message});
  }
  next();
};
