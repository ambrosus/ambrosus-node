import {put} from '../../src/utils/dict_utils';
import pkPair from './pk_pair';

const addSignature = (identityManager, entity, secret = pkPair.secret) => {
  const signature = identityManager.sign(secret, entity.content.idData);
  return put(entity, {
    'content.signature': signature
  });
};

export default addSignature;
