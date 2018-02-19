import {put, get} from '../../src/utils/dict_utils';
import pkPair from './pk_pair';
import addSignature from './add_signature';

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

export const createEvent = (fields, data) => ({
  content: {
    idData: {
      assetId: '0x6666',
      createdBy: pkPair.address,
      timestamp: Date.now(),
      accessLevel: 0,
      ...fields
    },
    data: {
      ...data
    }
  }
});

const addHash = (identityManager, object, fromPath, toPath) => {
  const hash = identityManager.calculateHash(get(object, fromPath));
  return put(object, toPath, hash);
};

export const addDataHashToEvent = (identityManager, event) => addHash(identityManager, event, 'content.data', 'content.idData.dataHash');
export const addAssetId = (identityManager, asset) => addHash(identityManager, asset, 'content', 'assetId');
export const addEventId = (identityManager, event) => addHash(identityManager, event, 'content', 'eventId');

export const createFullAsset = (identityManager, fields = {}, secret = pkPair.secret) => 
  addAssetId(
    identityManager, 
    addSignature(
      identityManager, 
      createAsset(fields), 
      secret));

export const createFullEvent = (identityManager, fields = {}, data = {}, secret = pkPair.secret) => 
  addEventId(
    identityManager, 
    addSignature(
      identityManager, 
      addDataHashToEvent(
        identityManager, 
        createEvent(
          fields, 
          data), 
        secret)));
