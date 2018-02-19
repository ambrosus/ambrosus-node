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
