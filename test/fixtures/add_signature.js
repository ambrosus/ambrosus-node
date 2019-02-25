/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

import {get, put} from '../../src/utils/dict_utils';
import pkPair from './pk_pair';

const addSignature = (identityManager, entity, secret = pkPair.secret, signaturePath = 'content.signature',
  dataPath = 'content.idData') => {
  const signature = identityManager.sign(secret, get(entity, dataPath));
  return put(entity, {
    [signaturePath]: signature
  });
};

export default addSignature;
