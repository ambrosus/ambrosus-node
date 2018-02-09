import {put} from '../../src/utils/dict_utils';
import pkPair from './pk_pair';

export const createAsset = (fields) => ({
  content: {
    idData: {
      createdBy: pkPair.address,
      timestamp: Date.now(),
      sequenceNumber: 0,
      ...fields
    }
  }
});

export const addSignatureToAsset = (identityManager, asset, secret = pkPair.secret) => {
  const signature = identityManager.sign(secret, asset.content.idData);
  return put(asset, {
    'content.signature': signature
  });
};
