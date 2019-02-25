/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {ValidationError} from '../errors/errors';
import {get, put} from '../utils/dict_utils';

const presignerMiddleware = (identityManager, toSignPath = 'content.idData', signaturePath = 'content.signature') => ((req, res, next) => {
  const existingSignature = get(req.body, signaturePath);
  if (existingSignature !== undefined) {
    next();
    return;
  }

  const {ambSecret} = req;
  if (!ambSecret) {
    next();
    return;
  }

  const toSign = get(req.body, toSignPath);
  if (typeof toSign === 'undefined') {
    throw new ValidationError(`No content found at ${toSignPath}`);
  }

  const signature = identityManager.sign(ambSecret, toSign);
  req.body = put(req.body, signaturePath, signature);
  next();
});

export default presignerMiddleware;

